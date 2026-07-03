package com.stickyburgers.service;

import com.stickyburgers.domain.Oferta;
import com.stickyburgers.repository.OfertaRepository;
import com.stickyburgers.web.dto.OfertaDto;
import com.stickyburgers.web.dto.OfertaRequest;
import com.stickyburgers.web.error.RecursoNoEncontradoException;
import com.stickyburgers.web.error.ReglaNegocioException;
import com.stickyburgers.web.mapper.OfertaMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Gestión de ofertas del panel del local. */
@Service
@Transactional(readOnly = true)
public class OfertaService {

    private final OfertaRepository repository;
    private final OfertaMapper mapper;

    public OfertaService(OfertaRepository repository, OfertaMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    /** Ofertas activas (público). */
    public List<OfertaDto> listarActivas() {
        return repository.findByActivaTrueOrderByIdDesc().stream().map(mapper::toDto).toList();
    }

    /** Todas las ofertas (admin). */
    public List<OfertaDto> listarTodas() {
        return repository.findAll().stream().map(mapper::toDto).toList();
    }

    @Transactional
    public OfertaDto crear(OfertaRequest request) {
        return mapper.toDto(repository.save(mapper.toEntity(request)));
    }

    @Transactional
    public OfertaDto actualizar(Long id, OfertaRequest request) {
        Oferta oferta = buscar(id);
        mapper.updateEntity(request, oferta);
        return mapper.toDto(repository.save(oferta));
    }

    @Transactional
    public void eliminar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNoEncontradoException("Oferta " + id + " no encontrada");
        }
        repository.deleteById(id);
    }

    /** Oferta que además debe estar activa (para poder comprarla en un pedido). */
    public Oferta buscarActiva(Long id) {
        Oferta oferta = buscar(id);
        if (!oferta.isActiva()) {
            throw new ReglaNegocioException("La oferta '" + oferta.getTitulo() + "' ya no está disponible");
        }
        return oferta;
    }

    private Oferta buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Oferta " + id + " no encontrada"));
    }
}
