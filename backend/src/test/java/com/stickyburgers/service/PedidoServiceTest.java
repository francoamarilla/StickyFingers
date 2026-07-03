package com.stickyburgers.service;

import com.stickyburgers.config.StickyProperties;
import com.stickyburgers.domain.*;
import com.stickyburgers.repository.PedidoRepository;
import com.stickyburgers.web.dto.*;
import com.stickyburgers.web.error.ReglaNegocioException;
import com.stickyburgers.web.mapper.PedidoMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PedidoServiceTest {

    @Mock PedidoRepository pedidoRepository;
    @Mock ProductoService productoService;
    @Mock OfertaService ofertaService;
    @Mock CostoEnvioService costoEnvioService;
    @Mock ConfiguracionService configuracionService;
    @Mock PedidoEventPublisher eventos;
    @Mock PedidoMapper mapper;

    PedidoService service;

    private final StickyProperties props = new StickyProperties(3500,
            new StickyProperties.Delivery(3, -31.4265, -64.1888),
            new StickyProperties.Jwt("x".repeat(40), 3600000),
            new StickyProperties.Admin("admin", "admin123"));

    @BeforeEach
    void setUp() {
        service = new PedidoService(pedidoRepository, productoService, ofertaService, costoEnvioService,
                configuracionService, eventos, mapper, props);
        lenient().when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(mapper.toDto(any(Pedido.class))).thenReturn(mock(PedidoDto.class));
    }

    private Producto burger(long id, int precio) {
        return Producto.builder().id(id).tipo(TipoProducto.HAMBURGUESA).nombre("B" + id).precio(precio).disponible(true).build();
    }

    @Test
    void crearCalculaSubtotalTotalYNumero() {
        when(productoService.buscar(1L)).thenReturn(burger(1L, 8000));
        when(costoEnvioService.calcular(TipoEntrega.RETIRO, null, false)).thenReturn(0);
        when(pedidoRepository.count()).thenReturn(0L);

        var req = new CrearPedidoRequest("Ana", "3548", TipoEntrega.RETIRO, null, null, null,
                MedioPago.EFECTIVO, null,
                List.of(new ItemPedidoRequest(1L, null, 2, true, "sin sal")));

        service.crear(req);

        ArgumentCaptor<Pedido> captor = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoRepository).save(captor.capture());
        Pedido p = captor.getValue();

        // (8000 + 3500 medallón) * 2 = 23000
        assertThat(p.getSubtotal()).isEqualTo(23000);
        assertThat(p.getCostoEnvio()).isZero();
        assertThat(p.getTotal()).isEqualTo(23000);
        assertThat(p.getEstado()).isEqualTo(EstadoPedido.NUEVO);
        assertThat(p.getNumero()).isEqualTo("#001");
        verify(eventos).pedidoNuevo(any());
    }

    @Test
    void totalIncluyeEnvioSinRecargoPorPago() {
        when(productoService.buscar(1L)).thenReturn(burger(1L, 10000));
        when(costoEnvioService.haversineKm(any(), any())).thenReturn(new java.math.BigDecimal("2.0"));
        when(costoEnvioService.calcular(any(), any(), anyBoolean())).thenReturn(2500);
        when(pedidoRepository.count()).thenReturn(5L);

        var req = new CrearPedidoRequest("Ana", "3548", TipoEntrega.DELIVERY, "Centro",
                new java.math.BigDecimal("-31.42"), new java.math.BigDecimal("-64.18"),
                MedioPago.TRANSFERENCIA, null,
                List.of(new ItemPedidoRequest(1L, null, 1, false, null)));

        service.crear(req);

        ArgumentCaptor<Pedido> captor = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoRepository).save(captor.capture());
        Pedido p = captor.getValue();
        assertThat(p.getSubtotal()).isEqualTo(10000);
        assertThat(p.getCostoEnvio()).isEqualTo(2500);
        assertThat(p.getTotal()).isEqualTo(12500);
        assertThat(p.getNumero()).isEqualTo("#006");
    }

    @Test
    void masDeSeisHamburguesasFalla() {
        when(productoService.buscar(1L)).thenReturn(burger(1L, 8000));

        var req = new CrearPedidoRequest("Ana", "3548", TipoEntrega.RETIRO, null, null, null,
                MedioPago.EFECTIVO, null,
                List.of(new ItemPedidoRequest(1L, null, 7, false, null)));

        assertThatThrownBy(() -> service.crear(req))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("6 hamburguesas");
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    void cambiarEstadoSinCuerpoAvanzaAlSiguiente() {
        Pedido pedido = Pedido.builder().id(1L).estado(EstadoPedido.NUEVO).build();
        when(pedidoRepository.findById(1L)).thenReturn(java.util.Optional.of(pedido));

        service.cambiarEstado(1L, null);

        assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.EN_PREPARACION);
        verify(eventos).estadoCambiado(any());
    }
}
