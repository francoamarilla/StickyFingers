package com.stickyburgers.security;

import com.stickyburgers.config.StickyProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/** Emisión y validación de tokens JWT (HS256). */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(StickyProperties props) {
        this.key = Keys.hmacShaKeyFor(props.jwt().secret().getBytes(StandardCharsets.UTF_8));
        this.expirationMs = props.jwt().expirationMs();
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public String generar(String username) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(username)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(key)
                .compact();
    }

    /** @return el username (subject) si el token es válido; null si es inválido o expiró. */
    public String extraerUsername(String token) {
        Claims claims = validar(token);
        return claims == null ? null : claims.getSubject();
    }

    /** @return los claims si la firma es válida y no expiró; null en cualquier otro caso. */
    public Claims validar(String token) {
        try {
            return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        } catch (Exception e) {
            return null;
        }
    }
}
