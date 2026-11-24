package com.stickyburgers.service;

import com.stickyburgers.web.dto.PedidoDto;
import com.stickyburgers.web.dto.PedidoEvento;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Publica eventos de pedidos por STOMP para el panel del local.
 * Solo viajan id y estado: los datos del cliente se piden por REST protegido.
 * Si hay una transacción activa, se publica después del commit. Así el panel nunca recibe
 * un id que todavía no puede leer, y un rollback no notifica nada.
 */
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
        publicar(TOPIC_NUEVOS, pedido);
    }

    /** Cambio de estado de un pedido (actualiza pantallas automáticamente). */
    public void estadoCambiado(PedidoDto pedido) {
        publicar(TOPIC_ESTADO, pedido);
    }

    private void publicar(String topic, PedidoDto pedido) {
        PedidoEvento evento = new PedidoEvento(pedido.id(), pedido.estado());
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            messaging.convertAndSend(topic, evento);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messaging.convertAndSend(topic, evento);
            }
        });
    }
}
