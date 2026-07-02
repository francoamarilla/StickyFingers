package com.stickyburgers.service;

import com.stickyburgers.config.StickyProperties;
import com.stickyburgers.domain.*;
import com.stickyburgers.repository.PedidoRepository;
import com.stickyburgers.web.dto.CambiarEstadoRequest;
import com.stickyburgers.web.dto.CrearPedidoRequest;
import com.stickyburgers.web.dto.ItemPedidoRequest;
import com.stickyburgers.web.dto.PedidoDto;
import com.stickyburgers.web.error.RecursoNoEncontradoException;
import com.stickyburgers.web.error.ReglaNegocioException;
import com.stickyburgers.web.mapper.PedidoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** Gestión de pedidos: creación con reglas de negocio y avance de estados. */
@Service
@Transactional(readOnly = true)
public class PedidoService {

    private static final int MAX_HAMBURGUESAS = 6;

    private final PedidoRepository pedidoRepository;
    private final ProductoService productoService;
    private final CostoEnvioService costoEnvioService;
    private final PedidoEventPublisher eventos;
    private final PedidoMapper mapper;
    private final int medallonPrecio;

    public PedidoService(PedidoRepository pedidoRepository, ProductoService productoService,
                         CostoEnvioService costoEnvioService, PedidoEventPublisher eventos,
                         PedidoMapper mapper, StickyProperties props) {
        this.pedidoRepository = pedidoRepository;
        this.productoService = productoService;
        this.costoEnvioService = costoEnvioService;
        this.eventos = eventos;
        this.mapper = mapper;
        this.medallonPrecio = props.medallonPrecio();
    }

    @Transactional
    public PedidoDto crear(CrearPedidoRequest req) {
        Pedido pedido = new Pedido();
        pedido.setFecha(Instant.now());
        pedido.setClienteNombre(req.clienteNombre().trim());
        pedido.setClienteTelefono(req.clienteTelefono().trim());
        pedido.setTipoEntrega(req.tipoEntrega());
        pedido.setDireccion(req.tipoEntrega() == TipoEntrega.DELIVERY ? textoOrNull(req.direccion()) : null);
        pedido.setKm(req.tipoEntrega() == TipoEntrega.DELIVERY ? req.km() : null);
        pedido.setLluvia(req.lluvia());
        pedido.setMedioPago(req.medioPago());
        pedido.setNotaGeneral(textoOrNull(req.notaGeneral()));
        pedido.setEstado(EstadoPedido.NUEVO);

        int subtotal = 0;
        int hamburguesas = 0;
        for (ItemPedidoRequest linea : req.items()) {
            Producto producto = productoService.buscar(linea.productoId());
            boolean esBurger = producto.getTipo() == TipoProducto.HAMBURGUESA;
            boolean medallon = esBurger && linea.medallonExtra();

            ItemPedido item = ItemPedido.builder()
                    .producto(producto)
                    .nombre(producto.getNombre())
                    .precioUnitario(producto.getPrecio())
                    .cantidad(linea.cantidad())
                    .medallonExtra(medallon)
                    .nota(textoOrNull(linea.nota()))
                    .tipoLinea(esBurger ? TipoLinea.BURGER : TipoLinea.EXTRA)
                    .build();
            pedido.addItem(item);

            int unitario = producto.getPrecio() + (medallon ? medallonPrecio : 0);
            subtotal += unitario * linea.cantidad();
            if (esBurger) {
                hamburguesas += linea.cantidad();
            }
        }

        if (hamburguesas > MAX_HAMBURGUESAS) {
            throw new ReglaNegocioException("Máximo " + MAX_HAMBURGUESAS + " hamburguesas por pedido");
        }

        int costoEnvio = costoEnvioService.calcular(req.tipoEntrega(), req.km(), req.lluvia());
        pedido.setSubtotal(subtotal);
        pedido.setCostoEnvio(costoEnvio);
        pedido.setTotal(subtotal + costoEnvio);
        pedido.setNumero(siguienteNumero());

        Pedido guardado = pedidoRepository.save(pedido);
        PedidoDto dto = mapper.toDto(guardado);
        eventos.pedidoNuevo(dto);
        return dto;
    }

    public java.util.List<PedidoDto> listar() {
        return pedidoRepository.findAllByOrderByFechaDesc().stream().map(mapper::toDto).toList();
    }

    @Transactional
    public PedidoDto cambiarEstado(Long id, CambiarEstadoRequest req) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido " + id + " no encontrado"));
        EstadoPedido nuevo = (req != null && req.estado() != null) ? req.estado() : pedido.getEstado().siguiente();
        pedido.setEstado(nuevo);
        PedidoDto dto = mapper.toDto(pedidoRepository.save(pedido));
        eventos.estadoCambiado(dto);
        return dto;
    }

    private String siguienteNumero() {
        long n = pedidoRepository.count() + 1;
        return String.format("#%03d", n);
    }

    private static String textoOrNull(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
