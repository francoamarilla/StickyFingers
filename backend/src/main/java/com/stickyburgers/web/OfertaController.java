package com.stickyburgers.web;

import com.stickyburgers.service.OfertaService;
import com.stickyburgers.web.dto.OfertaDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Ofertas activas visibles para los clientes (público). */
@RestController
@RequestMapping("/api/ofertas")
@Tag(name = "Ofertas", description = "Ofertas activas del local")
public class OfertaController {

    private final OfertaService ofertaService;

    public OfertaController(OfertaService ofertaService) {
        this.ofertaService = ofertaService;
    }

    @GetMapping
    @Operation(summary = "Listar ofertas activas")
    public List<OfertaDto> activas() {
        return ofertaService.listarActivas();
    }
}
