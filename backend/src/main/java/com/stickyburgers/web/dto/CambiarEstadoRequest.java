package com.stickyburgers.web.dto;

import com.stickyburgers.domain.EstadoPedido;

/**
 * Cambio de estado de un pedido. Si {@code estado} es null, el pedido avanza
 * al siguiente estado del flujo (NUEVO → EN_PREPARACION → LISTO → ENTREGADO).
 */
public record CambiarEstadoRequest(EstadoPedido estado) {}
