# Stack Tecnológico

## Objetivo

Desarrollar un sistema de gestión de pedidos para una hamburguesería y panel del local utilizando tecnologías modernas, buenas prácticas de desarrollo y una arquitectura escalable, priorizando la mantenibilidad y la calidad del código.

---

# Backend

* Java 21
* Spring Boot 3.x
* Spring Web (REST API)
* Spring Data JPA
* Hibernate
* Spring Validation (Jakarta Validation)
* Spring Security
* JWT (JSON Web Token)
* Spring WebSocket (STOMP)
* Lombok
* MapStruct
* Spring Boot DevTools

---

# Frontend

* Angular 21+
* TypeScript
* Angular Material
* RxJS
* Angular Signals

---

# Base de Datos

* PostgreSQL
* Flyway (Migraciones y versionado de la base de datos)

---

# Testing

* JUnit 5
* Mockito
* Spring Boot Test
* JaCoCo

Objetivos:

* Unit Testing
* Integration Testing
* Cobertura de código

---

# Documentación

* OpenAPI 3
* Swagger UI

La API debe estar completamente documentada y disponible automáticamente al ejecutar la aplicación.

---

# DevOps

* Docker
* Docker Compose
* Maven
* Git
* GitHub

Docker será utilizado para ejecutar al menos:

* PostgreSQL
* Backend (opcional durante desarrollo)
* Frontend (opcional para despliegue)

---

# Comunicación

## REST API

Toda la comunicación principal entre Frontend y Backend se realizará mediante REST.

## WebSockets

Se utilizarán WebSockets (STOMP) para notificaciones en tiempo real.

Ejemplos:

* Nuevo pedido recibido por cocina.
* Cambio de estado de un pedido.
* Pedido listo para retirar.
* Actualización automática de las pantallas sin necesidad de refrescar.

---

# Arquitectura

Arquitectura por capas.

```text
Controller
    │
Service
    │
Repository
    │
Database
```

Se utilizarán además:

* DTOs
* Entities
* Mappers (MapStruct)
* Repositories
* Services
* Controllers

---

# Buenas prácticas

* Principios SOLID
* Clean Code
* Separación de responsabilidades
* Validaciones en Backend
* Manejo global de excepciones (`@ControllerAdvice`)
* Uso de DTOs para desacoplar entidades
* Inyección de dependencias mediante Spring
* Nomenclatura consistente
* Respuestas HTTP adecuadas
* Código documentado cuando sea necesario

---

# Seguridad

Implementar autenticación mediante:

* Spring Security
* JWT

Solo existira un rol de usuario: Admin 
Los clientes compran sin iniciar secion

---

# Objetivo del proyecto

El proyecto debe servir como una aplicación completa que demuestre conocimientos en:

* Desarrollo Backend con Spring Boot.
* Desarrollo Frontend con Angular.
* Diseño y consumo de APIs REST.
* Comunicación en tiempo real mediante WebSockets.
* Persistencia con PostgreSQL.
* Testing.
* Seguridad.
* Docker.
* Buenas prácticas de arquitectura y desarrollo.

El código debe priorizar la claridad, escalabilidad y mantenibilidad, siguiendo estándares utilizados en proyectos profesionales.
