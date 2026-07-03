package com.stickyburgers.web;

import com.stickyburgers.service.ConfiguracionService;
import com.stickyburgers.web.dto.ConfiguracionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Configuración global visible para los clientes (público). */
@RestController
@RequestMapping("/api/config")
@Tag(name = "Configuración", description = "Configuración global del local")
public class ConfiguracionController {

    private final ConfiguracionService configuracionService;

    public ConfiguracionController(ConfiguracionService configuracionService) {
        this.configuracionService = configuracionService;
    }

    @GetMapping
    @Operation(summary = "Obtener la configuración global (p. ej. si está lloviendo)")
    public ConfiguracionDto obtener() {
        return configuracionService.obtener();
    }
}
