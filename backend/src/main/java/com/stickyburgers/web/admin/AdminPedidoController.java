package com.stickyburgers.web.admin;

import com.stickyburgers.service.PedidoService;
import com.stickyburgers.web.dto.CambiarEstadoRequest;
import com.stickyburgers.web.dto.PedidoDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Gestión de pedidos desde el panel (admin). */
@RestController
@RequestMapping("/api/admin/pedidos")
@Tag(name = "Admin · Pedidos", description = "Listado y cambio de estado de pedidos")
public class AdminPedidoController {

    private final PedidoService pedidoService;

    public AdminPedidoController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    @GetMapping
    @Operation(summary = "Listar pedidos (más recientes primero)")
    public List<PedidoDto> listar() {
        return pedidoService.listar();
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Cambiar el estado de un pedido (si no se indica, avanza al siguiente)")
    public PedidoDto cambiarEstado(@PathVariable Long id,
                                   @RequestBody(required = false) CambiarEstadoRequest request) {
        return pedidoService.cambiarEstado(id, request);
    }
}
