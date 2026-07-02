package com.stickyburgers.web.dto;

import com.stickyburgers.domain.TipoLinea;

/** Línea de un pedido tal como se expone en la API. */
public record ItemPedidoDto(
        Long id,
        Long productoId,
        String nombre,
        Integer precioUnitario,
        Integer cantidad,
        boolean medallonExtra,
        String nota,
        TipoLinea tipoLinea,
        Integer subtotalLinea
) {}
