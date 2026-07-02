package com.stickyburgers.service;

import com.stickyburgers.config.StickyProperties;
import com.stickyburgers.domain.TipoEntrega;
import com.stickyburgers.web.error.ReglaNegocioException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CostoEnvioServiceTest {

    private final CostoEnvioService service = new CostoEnvioService(
            new StickyProperties(3500,
                    new StickyProperties.Delivery(3),
                    new StickyProperties.Jwt("x".repeat(40), 3600000),
                    new StickyProperties.Admin("admin", "admin123")));

    @Test
    void retiroNoTieneCosto() {
        assertThat(service.calcular(TipoEntrega.RETIRO, null, false)).isZero();
    }

    @ParameterizedTest
    @CsvSource({
            "1.0,  false, 2500",
            "2.0,  false, 2500",
            "2.0,  true,  3000",
            "2.5,  false, 3000",
            "2.5,  true,  3500",
            "3.0,  false, 3500",
            "3.0,  true,  4000"
    })
    void deliveryPorTramo(String km, boolean lluvia, int esperado) {
        assertThat(service.calcular(TipoEntrega.DELIVERY, new BigDecimal(km), lluvia)).isEqualTo(esperado);
    }

    @Test
    void deliverySinKmFalla() {
        assertThatThrownBy(() -> service.calcular(TipoEntrega.DELIVERY, null, false))
                .isInstanceOf(ReglaNegocioException.class);
    }

    @Test
    void fueraDeRadioFalla() {
        assertThatThrownBy(() -> service.calcular(TipoEntrega.DELIVERY, new BigDecimal("3.5"), false))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("radio");
    }
}
