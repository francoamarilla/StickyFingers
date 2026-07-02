package com.stickyburgers.repository;

import com.stickyburgers.domain.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    List<Pedido> findAllByOrderByFechaDesc();

    List<Pedido> findByFechaBetweenOrderByFechaDesc(Instant desde, Instant hasta);

    long countByFechaBetween(Instant desde, Instant hasta);
}
