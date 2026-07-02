# Backend — Sticky Burgers

API REST del sistema de pedidos. **En construcción.**

## Stack

- Java 21 · Spring Boot 3.x
- Spring Web · Spring Data JPA / Hibernate · Spring Validation
- Spring Security + JWT · Spring WebSocket (STOMP)
- PostgreSQL · Flyway
- Lombok · MapStruct
- OpenAPI 3 / Swagger UI
- JUnit 5 · Mockito · JaCoCo
- Maven · Docker

## Arquitectura

Por capas: `Controller → Service → Repository → Database`, con DTOs y mappers (MapStruct) para desacoplar las entidades.

## Ejecución

> Pendiente: se documentará al inicializar el proyecto Spring Boot y el `docker-compose` de PostgreSQL.
