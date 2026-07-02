# Backend — Sticky Burgers

API REST del sistema de pedidos. Arquitectura por capas `Controller → Service → Repository → Database`.

## Stack

- Java 21 · Spring Boot 3.3
- Spring Web · Spring Data JPA / Hibernate · Spring Validation
- Spring Security + JWT (jjwt) · Spring WebSocket (STOMP)
- PostgreSQL · Flyway
- Lombok · MapStruct
- OpenAPI 3 / Swagger UI
- JUnit 5 · Mockito · JaCoCo

## Ejecución

1. **Base de datos** (desde la raíz del repo):

   ```bash
   docker compose up -d postgres
   ```

   > ⚠️ Si ya tenés un PostgreSQL local ocupando el puerto **5432**, publicá el
   > contenedor en otro puerto y apuntá el backend ahí:
   >
   > ```bash
   > DB_PORT=5433 docker compose up -d postgres
   > DB_PORT=5433 ./mvnw spring-boot:run
   > ```

2. **Backend**:

   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

   Flyway crea el esquema y siembra el menú (9 hamburguesas + 2 extras).
   Al arrancar se crea el usuario admin si no existe (`admin` / `admin123`, configurable
   con `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

3. **Swagger UI**: http://localhost:8080/swagger-ui.html

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `5432` / `sticky` | Conexión PostgreSQL |
| `DB_USER` / `DB_PASSWORD` | `sticky` / `sticky` | Credenciales DB |
| `JWT_SECRET` / `JWT_EXPIRATION_MS` | (dev) / `28800000` | Firma y expiración del JWT |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin123` | Admin sembrado al iniciar |

## Endpoints principales

**Públicos:** `GET /api/menu` · `GET /api/ofertas` · `POST /api/pedidos` · `POST /api/auth/login`

**Admin (rol ADMIN, requiere `Authorization: Bearer <jwt>`):**
`/api/admin/productos` (ABM) · `/api/admin/pedidos` (listar, `PATCH /{id}/estado`) ·
`/api/admin/ofertas` (ABM) · `GET /api/admin/informes?rango=DIA|SEMANA|MES`

**WebSocket (STOMP):** endpoint `/ws`, topics `/topic/pedidos-nuevos` y `/topic/pedidos-estado`.

## Reglas de negocio

- Máximo **6 hamburguesas** por pedido.
- Delivery solo hasta **3 km**; costo por tramo km (+ recargo por lluvia).
- Medios de pago: **efectivo** y **transferencia**, sin recargo. Total = subtotal + envío.
- Los importes se recalculan siempre en el servidor.

## Tests

```bash
cd backend
./mvnw test        # unit + integración (H2)
./mvnw verify      # + reporte JaCoCo en target/site/jacoco
```
