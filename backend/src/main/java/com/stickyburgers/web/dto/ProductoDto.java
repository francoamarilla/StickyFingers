package com.stickyburgers.web.dto;

import com.stickyburgers.domain.TipoProducto;

/** Representación de un producto del menú expuesta por la API. */
public record ProductoDto(
        Long id,
        TipoProducto tipo,
        String nombre,
        String descripcion,
        Integer precio,
        boolean disponible
) {}
