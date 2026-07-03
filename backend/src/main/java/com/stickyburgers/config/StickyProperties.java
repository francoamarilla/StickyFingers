package com.stickyburgers.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Propiedades de negocio y seguridad configurables bajo el prefijo {@code sticky}. */
@ConfigurationProperties(prefix = "sticky")
public record StickyProperties(
        Integer medallonPrecio,
        Delivery delivery,
        Jwt jwt,
        Admin admin
) {
    public record Delivery(Integer radioMaxKm, Double origenLat, Double origenLng) {}

    public record Jwt(String secret, long expirationMs) {}

    public record Admin(String username, String password) {}
}
