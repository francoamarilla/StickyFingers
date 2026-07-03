package com.stickyburgers.service;

import com.stickyburgers.domain.Configuracion;
import com.stickyburgers.repository.ConfiguracionRepository;
import com.stickyburgers.web.dto.ConfiguracionDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Configuración global del local (flag de lluvia que afecta el delivery). */
@Service
@Transactional(readOnly = true)
public class ConfiguracionService {

    private final ConfiguracionRepository repository;

    public ConfiguracionService(ConfiguracionRepository repository) {
        this.repository = repository;
    }

    /** Fila única de configuración; se crea con valores por defecto si no existe. */
    private Configuracion cargar() {
        return repository.findById(Configuracion.ID_UNICO)
                .orElseGet(() -> repository.save(
                        Configuracion.builder().id(Configuracion.ID_UNICO).lluvia(false).build()));
    }

    public boolean isLluvia() {
        return cargar().isLluvia();
    }

    public ConfiguracionDto obtener() {
        return new ConfiguracionDto(cargar().isLluvia());
    }

    @Transactional
    public ConfiguracionDto setLluvia(boolean lluvia) {
        Configuracion config = cargar();
        config.setLluvia(lluvia);
        return new ConfiguracionDto(repository.save(config).isLluvia());
    }
}
