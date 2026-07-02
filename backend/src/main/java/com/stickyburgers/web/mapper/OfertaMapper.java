package com.stickyburgers.web.mapper;

import com.stickyburgers.domain.Oferta;
import com.stickyburgers.web.dto.OfertaDto;
import com.stickyburgers.web.dto.OfertaRequest;
import org.mapstruct.*;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface OfertaMapper {

    OfertaDto toDto(Oferta oferta);

    @Mapping(target = "id", ignore = true)
    Oferta toEntity(OfertaRequest request);

    @Mapping(target = "id", ignore = true)
    void updateEntity(OfertaRequest request, @MappingTarget Oferta oferta);
}
