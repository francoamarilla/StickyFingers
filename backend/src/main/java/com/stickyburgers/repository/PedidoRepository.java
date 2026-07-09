package com.stickyburgers.repository;

import com.stickyburgers.domain.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    List<Pedido> findAllByOrderByFechaDesc();

    List<Pedido> findByFechaBetweenOrderByFechaDesc(Instant desde, Instant hasta);

    /**
     * Cuenta también los eliminados. Nativa a propósito: el @SQLRestriction de Pedido filtra
     * el count() de JPA, y numerar sobre los vivos repetiría el número de un pedido borrado
     * (la columna es UNIQUE).
     */
    @Query(value = "SELECT COUNT(*) FROM pedido", nativeQuery = true)
    long countIncluyendoEliminados();
}
