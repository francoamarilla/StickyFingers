package com.stickyburgers.web.dto;

import java.time.Instant;
import java.util.List;

/** Informe agregado de ventas para un rango (día / semana / mes). */
public record InformeDto(
        String rango,
        Instant desde,
        Instant hasta,
        long cantidadPedidos,
        long totalVentas,
        List<ProductoRanking> ranking
) {
    /** Producto y unidades vendidas en el rango. */
    public record ProductoRanking(String nombre, long cantidad) {}
}
