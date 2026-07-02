package com.stickyburgers.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Credenciales de acceso del administrador. */
public record LoginRequest(
        @NotBlank String username,
        @NotBlank String password
) {}
