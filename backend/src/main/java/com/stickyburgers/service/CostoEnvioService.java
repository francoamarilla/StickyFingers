package com.stickyburgers.service;

import com.stickyburgers.config.StickyProperties;
import com.stickyburgers.domain.TipoEntrega;
import com.stickyburgers.web.error.ReglaNegocioException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Calcula el costo de envío según la distancia y la lluvia.
 * Tabla (pesos): ≤2km 2500/3000 · ≤2.5km 3000/3500 · ≤3km 3500/4000 (normal/lluvia).
 * Fuera del radio máximo (3km) el delivery no está disponible.
 */
@Service
public class CostoEnvioService {

    private static final BigDecimal T1 = new BigDecimal("2");
    private static final BigDecimal T2 = new BigDecimal("2.5");

    private final BigDecimal radioMaxKm;

    public CostoEnvioService(StickyProperties props) {
        this.radioMaxKm = new BigDecimal(props.delivery().radioMaxKm());
    }

    /**
     * @return costo de envío en pesos; 0 si es retiro en el local.
     * @throws ReglaNegocioException si es delivery sin km válido o fuera del radio.
     */
    public int calcular(TipoEntrega tipoEntrega, BigDecimal km, boolean lluvia) {
        if (tipoEntrega != TipoEntrega.DELIVERY) {
            return 0;
        }
        if (km == null) {
            throw new ReglaNegocioException("La distancia (km) es obligatoria para delivery");
        }
        if (km.compareTo(radioMaxKm) > 0) {
            throw new ReglaNegocioException("La dirección queda fuera del radio de reparto (máx. " + radioMaxKm + " km)");
        }
        if (km.compareTo(T1) <= 0) {
            return lluvia ? 3000 : 2500;
        }
        if (km.compareTo(T2) <= 0) {
            return lluvia ? 3500 : 3000;
        }
        return lluvia ? 4000 : 3500;
    }
}
