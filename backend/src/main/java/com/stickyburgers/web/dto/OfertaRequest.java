package com.stickyburgers.web.dto;

import jakarta.validation.constraints.*;

/** Datos para crear o actualizar una oferta (admin). */
public record OfertaRequest(
        @NotBlank @Size(max = 120) String titulo,
        @Size(max = 2000) String descripcion,
        @NotNull @Positive Integer precio,
        @Size(max = 60) String vigencia,
        boolean activa
) {}
