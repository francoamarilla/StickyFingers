package com.stickyburgers.web.admin;

import com.stickyburgers.service.InformeService;
import com.stickyburgers.web.dto.InformeDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/** Informes de ventas (admin). */
@RestController
@RequestMapping("/api/admin/informes")
@Tag(name = "Admin · Informes", description = "Estadísticas de ventas por rango")
public class InformeController {

    private final InformeService informeService;

    public InformeController(InformeService informeService) {
        this.informeService = informeService;
    }

    @GetMapping
    @Operation(summary = "Informe de ventas por rango (DIA, SEMANA, MES)")
    public InformeDto informe(@RequestParam(defaultValue = "DIA") String rango) {
        return informeService.generar(rango);
    }
}
