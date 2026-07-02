package com.stickyburgers.domain;

/** Ciclo de vida de un pedido en cocina. */
public enum EstadoPedido {
    NUEVO,
    EN_PREPARACION,
    LISTO,
    ENTREGADO;

    /** Devuelve el siguiente estado del flujo, o el mismo si ya está ENTREGADO. */
    public EstadoPedido siguiente() {
        return switch (this) {
            case NUEVO -> EN_PREPARACION;
            case EN_PREPARACION -> LISTO;
            case LISTO -> ENTREGADO;
            case ENTREGADO -> ENTREGADO;
        };
    }
}
