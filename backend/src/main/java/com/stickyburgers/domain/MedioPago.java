package com.stickyburgers.domain;

/**
 * Medios de pago aceptados. Ninguno tiene recargo:
 * el total del pedido es siempre subtotal + costo de envío.
 */
public enum MedioPago {
    EFECTIVO,
    TRANSFERENCIA
}
