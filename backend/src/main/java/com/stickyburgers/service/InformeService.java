package com.stickyburgers.service;

import com.stickyburgers.domain.ItemPedido;
import com.stickyburgers.domain.Pedido;
import com.stickyburgers.repository.PedidoRepository;
import com.stickyburgers.web.dto.InformeDto;
import com.stickyburgers.web.error.ReglaNegocioException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/** Informes de ventas agregados por día, semana o mes. */
@Service
@Transactional(readOnly = true)
public class InformeService {

    /** Zona horaria del local (Argentina) para delimitar los rangos. */
    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Cordoba");

    private final PedidoRepository pedidoRepository;

    public InformeService(PedidoRepository pedidoRepository) {
        this.pedidoRepository = pedidoRepository;
    }

    public InformeDto generar(String rango) {
        String r = rango == null ? "DIA" : rango.trim().toUpperCase();
        LocalDate hoy = LocalDate.now(ZONA);
        LocalDate inicio = switch (r) {
            case "DIA" -> hoy;
            case "SEMANA" -> hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case "MES" -> hoy.with(TemporalAdjusters.firstDayOfMonth());
            default -> throw new ReglaNegocioException("Rango inválido: use DIA, SEMANA o MES");
        };
        Instant desde = inicio.atStartOfDay(ZONA).toInstant();
        Instant hasta = hoy.plusDays(1).atStartOfDay(ZONA).toInstant();

        List<Pedido> pedidos = pedidoRepository.findByFechaBetweenOrderByFechaDesc(desde, hasta);
        long totalVentas = pedidos.stream().mapToLong(Pedido::getTotal).sum();

        Map<String, Long> porProducto = new HashMap<>();
        for (Pedido p : pedidos) {
            for (ItemPedido it : p.getItems()) {
                porProducto.merge(it.getNombre(), (long) it.getCantidad(), Long::sum);
            }
        }
        List<InformeDto.ProductoRanking> ranking = porProducto.entrySet().stream()
                .map(e -> new InformeDto.ProductoRanking(e.getKey(), e.getValue()))
                .sorted(Comparator.comparingLong(InformeDto.ProductoRanking::cantidad).reversed())
                .toList();

        return new InformeDto(r, desde, hasta, pedidos.size(), totalVentas, ranking);
    }
}
