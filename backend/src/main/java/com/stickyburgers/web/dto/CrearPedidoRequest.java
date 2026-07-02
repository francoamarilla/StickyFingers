package com.stickyburgers.web.dto;

import com.stickyburgers.domain.MedioPago;
import com.stickyburgers.domain.TipoEntrega;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Solicitud de creación de pedido. El servidor recalcula subtotal, envío y total;
 * los importes nunca se toman del cliente.
 */
public record CrearPedidoRequest(
        @NotBlank @Size(max = 120) String clienteNombre,
        @NotBlank @Size(max = 40) String clienteTelefono,
        @NotNull TipoEntrega tipoEntrega,
        @Size(max = 200) String direccion,
        @DecimalMin("0.0") @DecimalMax("99.99") BigDecimal km,
        boolean lluvia,
        @NotNull MedioPago medioPago,
        @Size(max = 2000) String notaGeneral,
        @NotEmpty @Valid List<ItemPedidoRequest> items
) {}
