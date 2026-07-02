package com.stickyburgers.web.dto;

import jakarta.validation.constraints.*;

/** Línea solicitada dentro de un pedido. */
public record ItemPedidoRequest(
        @NotNull Long productoId,
        @NotNull @Min(1) Integer cantidad,
        boolean medallonExtra,
        @Size(max = 200) String nota
) {}
