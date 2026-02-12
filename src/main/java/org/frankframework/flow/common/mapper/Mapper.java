package org.frankframework.flow.common.mapper;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class Mapper {
    private final ObjectMapper objectMapper;

    public Mapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public <E, D> E toEntity(D dto, Class<E> entityClass) {
        return objectMapper.convertValue(dto, entityClass);
    }

    public <E, D> D toDTO(E entity, Class<D> dtoClass) {
        return objectMapper.convertValue(entity, dtoClass);
    }

    public <E, D> Set<E> toEntity(Set<D> dtoSet, Class<E> entityClass) throws MappingException {
        try {
            log.info("Converting {} DTOs to Entities [{}]", dtoSet.size(), entityClass.getSimpleName());
            Set<E> entities =
                    dtoSet.stream().map(dto -> toEntity(dto, entityClass)).collect(Collectors.toSet());
            log.info("Successfully mapped {} DTOs to Entities [{}]", dtoSet.size(), entityClass.getSimpleName());
            return entities;
        } catch (Exception e) {
            throw new MappingException("Failed to convert DTOs to Entities: " + e.getMessage(), e);
        }
    }

    public <E, D> Set<D> toDTO(Set<E> entitySet, Class<D> dtoClass) throws MappingException {
        try {
            log.info("Converting {} Entities to DTOs [{}]", entitySet.size(), dtoClass.getSimpleName());
            Set<D> dtos =
                    entitySet.stream().map(entity -> toDTO(entity, dtoClass)).collect(Collectors.toSet());
            log.info("Successfully mapped {} Entities to DTOs [{}]", entitySet.size(), dtoClass.getSimpleName());
            return dtos;
        } catch (Exception e) {
            throw new MappingException("Failed to convert Entities to DTOs: " + e.getMessage(), e);
        }
    }
}
