package com.stickyburgers.web.dto;

import com.stickyburgers.domain.TipoProducto;
import jakarta.validation.constraints.*;

/** Datos para crear o actualizar un producto del menú (admin). */
public record ProductoRequest(
        @NotNull TipoProducto tipo,
        @NotBlank @Size(max = 80) String nombre,
        @Size(max = 2000) String descripcion,
        @NotNull @Positive Integer precio,
        boolean disponible
) {}
