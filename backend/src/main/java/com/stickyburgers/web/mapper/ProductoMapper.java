package com.stickyburgers.web.mapper;

import com.stickyburgers.domain.Producto;
import com.stickyburgers.web.dto.ProductoDto;
import com.stickyburgers.web.dto.ProductoRequest;
import org.mapstruct.*;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ProductoMapper {

    ProductoDto toDto(Producto producto);

    @Mapping(target = "id", ignore = true)
    Producto toEntity(ProductoRequest request);

    @Mapping(target = "id", ignore = true)
    void updateEntity(ProductoRequest request, @MappingTarget Producto producto);
}
