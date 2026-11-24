# Pruebas automatizadas

[English version](en/testing.md) · [README](../README.es.md)

## Alcance

| Suite | Tipo y casos representativos |
|---|---|
| PedidoServiceTest | Unitarias con Mockito: subtotales, extras, envío, límite de hamburguesas, publicación de eventos y avance de estado. |
| CostoEnvioServiceTest | Unitarias y parametrizadas: retiro, tramos por distancia y lluvia, validación de distancia. |
| PedidoFlowIntegrationTest | Spring Boot Test y MockMvc: menú público, creación de pedido, rechazo de cantidades inválidas, autenticación, acceso admin, detalle de pedido por ID y baja lógica sin reciclar números. |
| WebSocketSecurityIntegrationTest | Integración STOMP con un cliente SockJS real contra el servidor: rechazo de CONNECT anónimo, con JWT inválido, expirado o sin rol ADMIN; recepción de eventos mínimos `{id, estado}`; bloqueo de SEND y de suscripciones con comodines; reconexión; cierre de la sesión con ERROR al vencer el token. |
| PedidoEventosTransaccionTest | Spring Boot Test: los eventos de pedido nuevo y de cambio de estado se publican solo después del commit y nunca ante un rollback. |
| pedidos.spec.ts (frontend) | Vitest: sincronización REST + WebSocket del panel, con eventos durante cargas pendientes, estados no crecientes, sin duplicados, una sola recarga en curso y sin sobrescribir cambios más recientes. |

El perfil de integración utiliza H2 en memoria con modo PostgreSQL, y Flyway deshabilitado. Estas pruebas no sustituyen una prueba de integración contra PostgreSQL real ni una prueba end-to-end en navegador.

## Ejecución

```bash
cd backend
./mvnw test
./mvnw verify

cd ../frontend
npm test -- --watch=false
```

JaCoCo genera el reporte en `target/site/jacoco/index.html` durante verify. Las pruebas existen en el repositorio; no se publica un porcentaje de cobertura ni se atribuye una ejecución exitosa sin un reporte actualizado.

[Código de pruebas](../backend/src/test/java/com/stickyburgers/) · [Configuración del perfil test](../backend/src/test/resources/application-test.yml)
