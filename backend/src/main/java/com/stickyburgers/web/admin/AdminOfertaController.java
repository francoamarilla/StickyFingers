package com.stickyburgers.web.admin;

import com.stickyburgers.service.OfertaService;
import com.stickyburgers.web.dto.OfertaDto;
import com.stickyburgers.web.dto.OfertaRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Gestión de ofertas (admin). */
@RestController
@RequestMapping("/api/admin/ofertas")
@Tag(name = "Admin · Ofertas", description = "ABM de ofertas del local")
public class AdminOfertaController {

    private final OfertaService ofertaService;

    public AdminOfertaController(OfertaService ofertaService) {
        this.ofertaService = ofertaService;
    }

    @GetMapping
    @Operation(summary = "Listar todas las ofertas")
    public List<OfertaDto> listar() {
        return ofertaService.listarTodas();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crear una oferta")
    public OfertaDto crear(@Valid @RequestBody OfertaRequest request) {
        return ofertaService.crear(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar una oferta")
    public OfertaDto actualizar(@PathVariable Long id, @Valid @RequestBody OfertaRequest request) {
        return ofertaService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Eliminar una oferta")
    public void eliminar(@PathVariable Long id) {
        ofertaService.eliminar(id);
    }
}
