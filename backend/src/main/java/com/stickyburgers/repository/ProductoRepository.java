package com.stickyburgers.repository;

import com.stickyburgers.domain.Producto;
import com.stickyburgers.domain.TipoProducto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    List<Producto> findByDisponibleTrueOrderByTipoAscNombreAsc();

    List<Producto> findByTipo(TipoProducto tipo);
}
