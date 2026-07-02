package com.stickyburgers.web;

import com.stickyburgers.service.PedidoService;
import com.stickyburgers.web.dto.CrearPedidoRequest;
import com.stickyburgers.web.dto.PedidoDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Alta de pedidos por parte de los clientes (público). */
@RestController
@RequestMapping("/api/pedidos")
@Tag(name = "Pedidos", description = "Creación de pedidos por clientes")
public class PedidoController {

    private final PedidoService pedidoService;

    public PedidoController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crear un pedido")
    public PedidoDto crear(@Valid @RequestBody CrearPedidoRequest request) {
        return pedidoService.crear(request);
    }
}
