package com.stickyburgers.web.admin;

import com.stickyburgers.service.ConfiguracionService;
import com.stickyburgers.web.dto.ActualizarConfiguracionRequest;
import com.stickyburgers.web.dto.ConfiguracionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/** Configuración global del local (admin). */
@RestController
@RequestMapping("/api/admin/config")
@Tag(name = "Admin · Configuración", description = "Configuración global del local")
public class AdminConfiguracionController {

    private final ConfiguracionService configuracionService;

    public AdminConfiguracionController(ConfiguracionService configuracionService) {
        this.configuracionService = configuracionService;
    }

    @GetMapping
    @Operation(summary = "Obtener la configuración global")
    public ConfiguracionDto obtener() {
        return configuracionService.obtener();
    }

    @PatchMapping
    @Operation(summary = "Activar o desactivar el flag de lluvia")
    public ConfiguracionDto actualizar(@RequestBody ActualizarConfiguracionRequest request) {
        return configuracionService.setLluvia(request.lluvia());
    }
}
