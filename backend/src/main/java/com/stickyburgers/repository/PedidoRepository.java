package com.stickyburgers.repository;

import com.stickyburgers.domain.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    List<Pedido> findAllByOrderByFechaDesc();

    List<Pedido> findByFechaBetweenOrderByFechaDesc(Instant desde, Instant hasta);

    /** Siguiente número de pedido. Atómico: dos creaciones concurrentes obtienen valores distintos. */
    @Query(value = "SELECT nextval('pedido_numero_seq')", nativeQuery = true)
    long siguienteNumeroSecuencia();
}
