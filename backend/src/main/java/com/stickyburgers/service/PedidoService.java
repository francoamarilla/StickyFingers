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
    private final OfertaService ofertaService;
    private final CostoEnvioService costoEnvioService;
    private final ConfiguracionService configuracionService;
    private final PedidoEventPublisher eventos;
    private final PedidoMapper mapper;
    private final int medallonPrecio;

    public PedidoService(PedidoRepository pedidoRepository, ProductoService productoService,
                         OfertaService ofertaService, CostoEnvioService costoEnvioService,
                         ConfiguracionService configuracionService, PedidoEventPublisher eventos,
                         PedidoMapper mapper, StickyProperties props) {
        this.pedidoRepository = pedidoRepository;
        this.productoService = productoService;
        this.ofertaService = ofertaService;
        this.costoEnvioService = costoEnvioService;
        this.configuracionService = configuracionService;
        this.eventos = eventos;
        this.mapper = mapper;
        this.medallonPrecio = props.medallonPrecio();
    }

    @Transactional
    public PedidoDto crear(CrearPedidoRequest req) {
        boolean esDelivery = req.tipoEntrega() == TipoEntrega.DELIVERY;
        boolean lluvia = configuracionService.isLluvia();
        // Delivery sin coordenadas: el cliente no eligió una dirección sugerida y escribió la
        // suya a mano. No se puede calcular la distancia, así que el envío se coordina luego
        // por WhatsApp (no se cobra automáticamente).
        boolean tieneCoordenadas = req.lat() != null && req.lng() != null;
        java.math.BigDecimal km = (esDelivery && tieneCoordenadas)
                ? costoEnvioService.haversineKm(req.lat(), req.lng())
                : null;

        Pedido pedido = new Pedido();
        pedido.setFecha(Instant.now());
        pedido.setClienteNombre(req.clienteNombre().trim());
        pedido.setClienteTelefono(req.clienteTelefono().trim());
        pedido.setTipoEntrega(req.tipoEntrega());
        pedido.setDireccion(esDelivery ? textoOrNull(req.direccion()) : null);
        pedido.setKm(km);
        pedido.setLluvia(lluvia);
        pedido.setMedioPago(req.medioPago());
        pedido.setNotaGeneral(textoOrNull(req.notaGeneral()));
        pedido.setEstado(EstadoPedido.NUEVO);

        int subtotal = 0;
        int hamburguesas = 0;
        for (ItemPedidoRequest linea : req.items()) {
            ItemPedido item;
            int unitario;
            boolean esBurger = false;

            if (linea.esOferta()) {
                Oferta oferta = ofertaService.buscarActiva(linea.ofertaId());
                item = ItemPedido.builder()
                        .nombre(oferta.getTitulo())
                        .precioUnitario(oferta.getPrecio())
                        .cantidad(linea.cantidad())
                        .medallonExtra(false)
                        .nota(textoOrNull(linea.nota()))
                        .tipoLinea(TipoLinea.OFERTA)
                        .build();
                unitario = oferta.getPrecio();
            } else {
                if (linea.productoId() == null) {
                    throw new ReglaNegocioException("Cada línea debe referenciar un producto o una oferta");
                }
                Producto producto = productoService.buscar(linea.productoId());
                esBurger = producto.getTipo() == TipoProducto.HAMBURGUESA;
                boolean medallon = esBurger && linea.medallonExtra();
                item = ItemPedido.builder()
                        .producto(producto)
                        .nombre(producto.getNombre())
                        .precioUnitario(producto.getPrecio())
                        .cantidad(linea.cantidad())
                        .medallonExtra(medallon)
                        .nota(textoOrNull(linea.nota()))
                        .tipoLinea(esBurger ? TipoLinea.BURGER : TipoLinea.EXTRA)
                        .build();
                unitario = producto.getPrecio() + (medallon ? medallonPrecio : 0);
            }

            pedido.addItem(item);
            subtotal += unitario * linea.cantidad();
            if (esBurger) {
                hamburguesas += linea.cantidad();
            }
        }

        if (hamburguesas > MAX_HAMBURGUESAS) {
            throw new ReglaNegocioException("Máximo " + MAX_HAMBURGUESAS + " hamburguesas por pedido");
        }

        // El envío solo se cobra automáticamente en delivery con dirección geolocalizada dentro del
        // radio. Sin coordenadas o fuera de radio NO se cancela el pedido: se registra igual (envío 0)
        // y el local coordina el costo con el cliente; la distancia queda guardada para que lo decida.
        int costoEnvio = (esDelivery && costoEnvioService.dentroDelRadio(km))
                ? costoEnvioService.calcular(TipoEntrega.DELIVERY, km, lluvia)
                : 0;
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

    /** Borrado lógico: el pedido desaparece del panel y de los informes, la fila queda. */
    @Transactional
    public void eliminar(Long id) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido " + id + " no encontrado"));
        pedido.setEliminado(true);
        pedidoRepository.save(pedido);
    }

    private String siguienteNumero() {
        long n = pedidoRepository.countIncluyendoEliminados() + 1;
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
