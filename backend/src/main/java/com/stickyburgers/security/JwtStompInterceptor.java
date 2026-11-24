package com.stickyburgers.security;

import io.jsonwebtoken.Claims;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Autenticación JWT de las sesiones STOMP. La instancia va en el canal de entrada y
 * {@link #salida()} en el de salida.
 *
 * <ul>
 *   <li>CONNECT: valida el header nativo STOMP {@code Authorization: Bearer <jwt>} con el mismo
 *       {@link JwtService} que la API REST y asocia el usuario a la sesión. Los navegadores no
 *       pueden mandar headers en el handshake HTTP del WebSocket/SockJS: por eso el token viaja
 *       en el frame CONNECT y no en la URL.</li>
 *   <li>Vencimiento: guarda el {@code exp} del token por sesión. Después de esa fecha se rechazan
 *       los frames entrantes y cada MESSAGE saliente se reemplaza por un ERROR. Spring cierra la
 *       sesión al enviar un ERROR, así que no se entrega ningún dato con el token vencido.</li>
 * </ul>
 *
 * La autorización por rol y destino se hace después, en el {@code AuthorizationChannelInterceptor}
 * (ver {@code WebSocketConfig}). Este interceptor nunca loguea el token.
 */
@Component
public class JwtStompInterceptor implements ChannelInterceptor {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final AdminUserDetailsService userDetailsService;
    /** Vencimiento del token de cada sesión STOMP autenticada (sessionId → exp). */
    private final Map<String, Instant> expiraciones = new ConcurrentHashMap<>();

    public JwtStompInterceptor(JwtService jwtService, AdminUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        SimpMessageType tipo = SimpMessageHeaderAccessor.getMessageType(message.getHeaders());
        String sessionId = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());
        if (tipo == null || sessionId == null) {
            return message;
        }
        return switch (tipo) {
            case CONNECT -> autenticar(message, sessionId);
            case DISCONNECT -> {
                expiraciones.remove(sessionId);
                yield message;
            }
            default -> {
                // SUBSCRIBE, SEND, UNSUBSCRIBE, HEARTBEAT...
                if (vencida(sessionId)) {
                    throw new CredentialsExpiredException("Token expirado");
                }
                yield message;
            }
        };
    }

    /** Interceptor del canal de salida: corta la entrega de MESSAGE a sesiones con token vencido. */
    public ChannelInterceptor salida() {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                String sessionId = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());
                return SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) == SimpMessageType.MESSAGE
                        && sessionId != null
                        ? filtrarSaliente(message, sessionId)
                        : message;
            }
        };
    }

    private Message<?> autenticar(Message<?> message, String sessionId) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        String header = accessor == null ? null : accessor.getFirstNativeHeader("Authorization");
        Claims claims = (header != null && header.startsWith(PREFIX))
                ? jwtService.validar(header.substring(PREFIX.length()))
                : null;
        if (claims == null || claims.getSubject() == null || claims.getExpiration() == null) {
            throw new BadCredentialsException("Token inválido o ausente");
        }
        UserDetails user;
        try {
            user = userDetailsService.loadUserByUsername(claims.getSubject());
        } catch (UsernameNotFoundException e) {
            throw new BadCredentialsException("Token inválido o ausente");
        }
        // El accessor es mutable durante el envío entrante: Spring guarda este usuario en la sesión.
        accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        expiraciones.put(sessionId, claims.getExpiration().toInstant());
        return message;
    }

    private Message<?> filtrarSaliente(Message<?> message, String sessionId) {
        Instant exp = expiraciones.get(sessionId);
        if (exp == null) {
            // Sesión sin CONNECT autenticado (o ya cortada por vencimiento): no se entrega nada.
            return null;
        }
        if (Instant.now().isBefore(exp)) {
            return message;
        }
        // Se quita ya para que los MESSAGE que lleguen antes del cierre se descarten.
        expiraciones.remove(sessionId);
        StompHeaderAccessor error = StompHeaderAccessor.create(StompCommand.ERROR);
        error.setMessage("Token expirado");
        error.setSessionId(sessionId);
        return MessageBuilder.createMessage(new byte[0], error.getMessageHeaders());
    }

    private boolean vencida(String sessionId) {
        Instant exp = expiraciones.get(sessionId);
        return exp != null && !Instant.now().isBefore(exp);
    }

    /** Cantidad de sesiones con token registrado (para verificar la limpieza en los tests). */
    int sesionesRegistradas() {
        return expiraciones.size();
    }
}
