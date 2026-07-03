package com.stickyburgers.web.dto;

import com.stickyburgers.domain.MedioPago;
import com.stickyburgers.domain.TipoEntrega;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Solicitud de creación de pedido. El servidor recalcula distancia (Haversine),
 * subtotal, envío y total; los importes y la distancia nunca se toman del cliente.
 * Para delivery se envían las coordenadas ({@code lat}/{@code lng}) obtenidas al
 * geocodificar la dirección; el flag de lluvia es global (lo controla el admin).
 */
public record CrearPedidoRequest(
        @NotBlank @Size(max = 120) String clienteNombre,
        @NotBlank @Size(max = 40) String clienteTelefono,
        @NotNull TipoEntrega tipoEntrega,
        @Size(max = 200) String direccion,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal lat,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal lng,
        @NotNull MedioPago medioPago,
        @Size(max = 2000) String notaGeneral,
        @NotEmpty @Valid List<ItemPedidoRequest> items
) {}
