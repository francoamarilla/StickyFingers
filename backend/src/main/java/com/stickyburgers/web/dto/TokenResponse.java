package com.stickyburgers.web.dto;

/** Token JWT devuelto tras un login exitoso. */
public record TokenResponse(
        String token,
        String tipo,
        long expiraEnMs
) {
    public static TokenResponse bearer(String token, long expiraEnMs) {
        return new TokenResponse(token, "Bearer", expiraEnMs);
    }
}
