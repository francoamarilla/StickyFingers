package com.stickyburgers.repository;

import com.stickyburgers.domain.Oferta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OfertaRepository extends JpaRepository<Oferta, Long> {

    List<Oferta> findByActivaTrueOrderByIdDesc();
}
