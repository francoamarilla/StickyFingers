package com.stickyburgers.service;

import com.stickyburgers.domain.Producto;
import com.stickyburgers.repository.ProductoRepository;
import com.stickyburgers.web.dto.ProductoDto;
import com.stickyburgers.web.dto.ProductoRequest;
import com.stickyburgers.web.error.RecursoNoEncontradoException;
import com.stickyburgers.web.mapper.ProductoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Gestión del menú de productos. */
@Service
@Transactional(readOnly = true)
public class ProductoService {

    private final ProductoRepository repository;
    private final ProductoMapper mapper;

    public ProductoService(ProductoRepository repository, ProductoMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    /** Menú público: solo productos disponibles. */
    public List<ProductoDto> listarDisponibles() {
        return repository.findByDisponibleTrueOrderByTipoAscNombreAsc().stream().map(mapper::toDto).toList();
    }

    /** Listado completo (admin), incluye no disponibles. */
    public List<ProductoDto> listarTodos() {
        return repository.findAll().stream().map(mapper::toDto).toList();
    }

    public ProductoDto obtener(Long id) {
        return mapper.toDto(buscar(id));
    }

    @Transactional
    public ProductoDto crear(ProductoRequest request) {
        Producto guardado = repository.save(mapper.toEntity(request));
        return mapper.toDto(guardado);
    }

    @Transactional
    public ProductoDto actualizar(Long id, ProductoRequest request) {
        Producto producto = buscar(id);
        mapper.updateEntity(request, producto);
        return mapper.toDto(repository.save(producto));
    }

    @Transactional
    public void eliminar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNoEncontradoException("Producto " + id + " no encontrado");
        }
        repository.deleteById(id);
    }

    /** Búsqueda usada también por otros servicios. Lanza 404 si no existe. */
    public Producto buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto " + id + " no encontrado"));
    }
}
