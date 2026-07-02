package com.stickyburgers.web.mapper;

import com.stickyburgers.config.StickyProperties;
import com.stickyburgers.domain.ItemPedido;
import com.stickyburgers.domain.Pedido;
import com.stickyburgers.web.dto.ItemPedidoDto;
import com.stickyburgers.web.dto.PedidoDto;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Mapea pedidos a DTO. Escrito a mano (no MapStruct) porque el subtotal por línea
 * depende del precio del medallón, que es configuración de runtime.
 */
@Component
public class PedidoMapper {

    private final int medallonPrecio;

    public PedidoMapper(StickyProperties props) {
        this.medallonPrecio = props.medallonPrecio();
    }

    public PedidoDto toDto(Pedido p) {
        List<ItemPedidoDto> items = p.getItems().stream().map(this::toItemDto).toList();
        return new PedidoDto(
                p.getId(), p.getNumero(), p.getFecha(),
                p.getClienteNombre(), p.getClienteTelefono(),
                p.getTipoEntrega(), p.getDireccion(), p.getKm(), p.isLluvia(),
                p.getSubtotal(), p.getCostoEnvio(), p.getTotal(),
                p.getMedioPago(), p.getNotaGeneral(), p.getEstado(),
                items
        );
    }

    private ItemPedidoDto toItemDto(ItemPedido i) {
        int unitario = i.getPrecioUnitario() + (i.isMedallonExtra() ? medallonPrecio : 0);
        int subtotalLinea = unitario * i.getCantidad();
        return new ItemPedidoDto(
                i.getId(),
                i.getProducto() != null ? i.getProducto().getId() : null,
                i.getNombre(), i.getPrecioUnitario(), i.getCantidad(),
                i.isMedallonExtra(), i.getNota(), i.getTipoLinea(),
                subtotalLinea
        );
    }
}
