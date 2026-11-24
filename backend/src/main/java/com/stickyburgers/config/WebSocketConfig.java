package com.stickyburgers.config;

import com.stickyburgers.security.JwtStompInterceptor;
import com.stickyburgers.service.PedidoEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.messaging.access.intercept.AuthorizationChannelInterceptor;
import org.springframework.security.messaging.access.intercept.MessageMatcherDelegatingAuthorizationManager;
import org.springframework.security.messaging.context.SecurityContextChannelInterceptor;
import org.springframework.web.socket.config.annotation.*;

import java.util.List;

/**
 * Configuración STOMP para notificaciones en tiempo real al panel del local.
 *
 * <p>Seguridad: el handshake {@code /ws/**} es público a nivel HTTP (el navegador no puede mandar
 * headers ahí). La autenticación y la autorización se aplican a cada frame STOMP:
 * JWT en el CONNECT ({@link JwtStompInterceptor}), rol ADMIN para conectarse y suscribirse a los
 * topics de pedidos, y todo lo demás (incluido cualquier SEND) se rechaza.
 * No se usa {@code @EnableWebSocketSecurity} porque fuerza CSRF en el CONNECT. Acá no hace falta:
 * la credencial es un token explícito en el frame, no una cookie que el navegador mande solo.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /** Mismos orígenes que CORS (front Angular). Configurable con sticky.cors.allowed-origins / CORS_ORIGINS. */
    @Value("${sticky.cors.allowed-origins:http://localhost:4200}")
    private List<String> allowedOrigins;

    private final JwtStompInterceptor jwtStompInterceptor;

    public WebSocketConfig(JwtStompInterceptor jwtStompInterceptor) {
        this.jwtStompInterceptor = jwtStompInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.toArray(String[]::new))
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Orden: autenticar el CONNECT → poblar el SecurityContext → autorizar.
        registration.interceptors(
                jwtStompInterceptor,
                new SecurityContextChannelInterceptor(),
                new AuthorizationChannelInterceptor(autorizacion()));
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtStompInterceptor.salida());
    }

    /** Deny by default: solo ADMIN conecta y se suscribe a los topics exactos (sin comodines). */
    static AuthorizationManager<Message<?>> autorizacion() {
        return MessageMatcherDelegatingAuthorizationManager.builder()
                .simpTypeMatchers(SimpMessageType.CONNECT).hasRole("ADMIN")
                .simpSubscribeDestMatchers(PedidoEventPublisher.TOPIC_NUEVOS, PedidoEventPublisher.TOPIC_ESTADO)
                .hasRole("ADMIN")
                .simpTypeMatchers(SimpMessageType.UNSUBSCRIBE, SimpMessageType.DISCONNECT,
                        SimpMessageType.HEARTBEAT).permitAll()
                .anyMessage().denyAll()
                .build();
    }
}
