package com.stickyburgers.web.dto;

/** Oferta expuesta por la API. */
public record OfertaDto(
        Long id,
        String titulo,
        String descripcion,
        Integer precio,
        String vigencia,
        boolean activa
) {}
