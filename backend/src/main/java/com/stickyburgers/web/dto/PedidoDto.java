package com.stickyburgers.web.dto;

import com.stickyburgers.domain.EstadoPedido;
import com.stickyburgers.domain.MedioPago;
import com.stickyburgers.domain.TipoEntrega;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Pedido completo expuesto por la API. */
public record PedidoDto(
        Long id,
        String numero,
        Instant fecha,
        String clienteNombre,
        String clienteTelefono,
        TipoEntrega tipoEntrega,
        String direccion,
        BigDecimal km,
        boolean lluvia,
        Integer subtotal,
        Integer costoEnvio,
        Integer total,
        MedioPago medioPago,
        String notaGeneral,
        EstadoPedido estado,
        List<ItemPedidoDto> items
) {}
