package com.stickyburgers.service;

import com.stickyburgers.web.dto.PedidoDto;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/** Publica eventos de pedidos por STOMP para las pantallas del local. */
@Component
public class PedidoEventPublisher {

    public static final String TOPIC_NUEVOS = "/topic/pedidos-nuevos";
    public static final String TOPIC_ESTADO = "/topic/pedidos-estado";

    private final SimpMessagingTemplate messaging;

    public PedidoEventPublisher(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    /** Nuevo pedido recibido por cocina. */
    public void pedidoNuevo(PedidoDto pedido) {
        messaging.convertAndSend(TOPIC_NUEVOS, pedido);
    }

    /** Cambio de estado de un pedido (actualiza pantallas automáticamente). */
    public void estadoCambiado(PedidoDto pedido) {
        messaging.convertAndSend(TOPIC_ESTADO, pedido);
    }
}
