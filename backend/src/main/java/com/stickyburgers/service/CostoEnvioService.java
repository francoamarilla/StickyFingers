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
    private static final double RADIO_TIERRA_KM = 6371.0;

    private final BigDecimal radioMaxKm;
    private final double origenLat;
    private final double origenLng;

    public CostoEnvioService(StickyProperties props) {
        this.radioMaxKm = new BigDecimal(props.delivery().radioMaxKm());
        this.origenLat = props.delivery().origenLat();
        this.origenLng = props.delivery().origenLng();
    }

    /**
     * Distancia en km entre el local y las coordenadas del cliente (fórmula de Haversine).
     * @throws ReglaNegocioException si faltan las coordenadas.
     */
    public BigDecimal haversineKm(BigDecimal lat, BigDecimal lng) {
        if (lat == null || lng == null) {
            throw new ReglaNegocioException("Las coordenadas de la dirección son obligatorias para delivery");
        }
        double dLat = Math.toRadians(lat.doubleValue() - origenLat);
        double dLng = Math.toRadians(lng.doubleValue() - origenLng);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(origenLat)) * Math.cos(Math.toRadians(lat.doubleValue()))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return BigDecimal.valueOf(RADIO_TIERRA_KM * c).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    /** true si hay distancia y está dentro del radio de reparto (delivery con envío calculable). */
    public boolean dentroDelRadio(BigDecimal km) {
        return km != null && km.compareTo(radioMaxKm) <= 0;
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
