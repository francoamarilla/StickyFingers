package com.stickyburgers.web.dto;

import com.stickyburgers.domain.EstadoPedido;

/**
 * Evento STOMP mínimo, sin datos personales. El tipo de evento lo indica el topic. El panel pide
 * el detalle por REST protegido ({@code GET /api/admin/pedidos/{id}}).
 */
public record PedidoEvento(Long id, EstadoPedido estado) {}
