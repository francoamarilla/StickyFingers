# Pruebas automatizadas

[English version](en/testing.md) · [README](../README.md)

## Alcance

| Suite | Tipo y casos representativos |
|---|---|
| PedidoServiceTest | Unitarias con Mockito: subtotales, extras, envío, límite de hamburguesas, publicación de eventos y avance de estado. |
| CostoEnvioServiceTest | Unitarias y parametrizadas: retiro, tramos por distancia y lluvia, validación de distancia. |
| PedidoFlowIntegrationTest | Spring Boot Test y MockMvc: menú público, creación de pedido, rechazo de cantidades inválidas, autenticación, acceso admin y baja lógica sin reciclar números. |

El perfil de integración utiliza H2 en memoria con modo PostgreSQL, y Flyway deshabilitado. Estas pruebas no sustituyen una prueba de integración contra PostgreSQL real ni una prueba end-to-end de WebSocket.

## Ejecución

```bash
cd backend
./mvnw test
./mvnw verify
```

JaCoCo genera el reporte en `target/site/jacoco/index.html` durante verify. Las pruebas existen en el repositorio; no se publica un porcentaje de cobertura ni se atribuye una ejecución exitosa sin un reporte actualizado.

[Código de pruebas](../backend/src/test/java/com/stickyburgers/) · [Configuración del perfil test](../backend/src/test/resources/application-test.yml)
