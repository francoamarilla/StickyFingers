package com.stickyburgers.service;

import com.stickyburgers.domain.EstadoPedido;
import com.stickyburgers.domain.MedioPago;
import com.stickyburgers.domain.Producto;
import com.stickyburgers.domain.TipoEntrega;
import com.stickyburgers.domain.TipoProducto;
import com.stickyburgers.repository.ProductoRepository;
import com.stickyburgers.web.dto.CrearPedidoRequest;
import com.stickyburgers.web.dto.ItemPedidoRequest;
import com.stickyburgers.web.dto.PedidoDto;
import com.stickyburgers.web.dto.PedidoEvento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

import static com.stickyburgers.service.PedidoEventPublisher.TOPIC_ESTADO;
import static com.stickyburgers.service.PedidoEventPublisher.TOPIC_NUEVOS;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Los eventos STOMP salen solo después del commit, y nunca si la transacción hace rollback. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:eventos-tx;DB_CLOSE_DELAY=-1;MODE=PostgreSQL")
@ActiveProfiles("test")
class PedidoEventosTransaccionTest {

    @Autowired PedidoService pedidoService;
    @Autowired ProductoRepository productoRepository;
    @Autowired TransactionTemplate tx;
    @SpyBean SimpMessagingTemplate messaging;

    private Long burgerId;

    @BeforeEach
    void seed() {
        burgerId = productoRepository.save(Producto.builder()
                .tipo(TipoProducto.HAMBURGUESA).nombre("Queso Simple")
                .descripcion("test").precio(8000).disponible(true).build()).getId();
        clearInvocations(messaging);
    }

    private CrearPedidoRequest request() {
        return new CrearPedidoRequest("Ana", "3548", TipoEntrega.RETIRO, null, null, null,
                MedioPago.EFECTIVO, null, List.of(new ItemPedidoRequest(burgerId, null, 1, false, null)));
    }

    private void verificarSinPublicar() {
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void pedidoNuevoSePublicaRecienDespuesDelCommit() {
        PedidoDto creado = tx.execute(status -> {
            PedidoDto dto = pedidoService.crear(request());
            verificarSinPublicar(); // todavía dentro de la transacción
            return dto;
        });
        verify(messaging).convertAndSend(TOPIC_NUEVOS, new PedidoEvento(creado.id(), EstadoPedido.NUEVO));
    }

    @Test
    void pedidoNuevoConRollbackNoSePublica() {
        tx.executeWithoutResult(status -> {
            pedidoService.crear(request());
            status.setRollbackOnly();
        });
        verificarSinPublicar();
    }

    @Test
    void cambioDeEstadoSePublicaRecienDespuesDelCommit() {
        Long id = pedidoService.crear(request()).id();
        clearInvocations(messaging);

        tx.executeWithoutResult(status -> {
            pedidoService.cambiarEstado(id, null);
            verificarSinPublicar();
        });
        verify(messaging).convertAndSend(TOPIC_ESTADO, new PedidoEvento(id, EstadoPedido.EN_PREPARACION));
    }

    @Test
    void cambioDeEstadoConRollbackNoSePublica() {
        Long id = pedidoService.crear(request()).id();
        clearInvocations(messaging);

        tx.executeWithoutResult(status -> {
            pedidoService.cambiarEstado(id, null);
            status.setRollbackOnly();
        });
        verificarSinPublicar();
    }

    @Test
    void sinTransaccionExternaElServicioPublicaAlConfirmarLaSuya() {
        Long id = pedidoService.crear(request()).id();
        verify(messaging).convertAndSend(TOPIC_NUEVOS, new PedidoEvento(id, EstadoPedido.NUEVO));
    }
}
