package com.stickyburgers.web;

import com.stickyburgers.service.ProductoService;
import com.stickyburgers.web.dto.ProductoDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Menú público de productos disponibles. */
@RestController
@RequestMapping("/api/menu")
@Tag(name = "Menú", description = "Carta pública de Sticky Burgers")
public class MenuController {

    private final ProductoService productoService;

    public MenuController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @GetMapping
    @Operation(summary = "Listar productos disponibles")
    public List<ProductoDto> menu() {
        return productoService.listarDisponibles();
    }
}
