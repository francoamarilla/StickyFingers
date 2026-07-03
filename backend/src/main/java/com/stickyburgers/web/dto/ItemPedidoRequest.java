package com.stickyburgers.web.dto;

import jakarta.validation.constraints.*;

/**
 * Línea solicitada dentro de un pedido. Debe referenciar exactamente uno:
 * {@code productoId} (producto del menú) u {@code ofertaId} (oferta activa).
 */
public record ItemPedidoRequest(
        Long productoId,
        Long ofertaId,
        @NotNull @Min(1) Integer cantidad,
        boolean medallonExtra,
        @Size(max = 200) String nota
) {
    /** Verdadero si referencia una oferta en lugar de un producto del menú. */
    public boolean esOferta() {
        return ofertaId != null;
    }
}
