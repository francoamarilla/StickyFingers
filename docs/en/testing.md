# Automated testing

[Versión en español](../testing.md) · [README](../../README.md)

## Scope

| Suite | Type and representative cases |
|---|---|
| PedidoServiceTest | Unit tests with Mockito: subtotals, extras, delivery, burger limits, event publishing and state progression. |
| CostoEnvioServiceTest | Unit and parameterized tests: pickup, distance bands and rain, distance validation. |
| PedidoFlowIntegrationTest | Spring Boot Test and MockMvc: public menu, order creation, invalid quantities, authentication, admin access, order details by ID and soft deletion without reusing numbers. |
| WebSocketSecurityIntegrationTest | STOMP integration with a real SockJS client against the running server: CONNECT rejected when anonymous, with an invalid or expired JWT, or without the ADMIN role; minimal `{id, estado}` events; SEND and wildcard subscriptions blocked; reconnection; session closed with ERROR when the token expires. |
| PedidoEventosTransaccionTest | Spring Boot Test: new-order and status-change events are published only after commit and never on rollback. |
| pedidos.spec.ts (frontend) | Vitest: panel REST + WebSocket sync, with events during pending loads, non-increasing status changes, no duplicates, a single reload in flight and no overwriting of newer changes. |

The integration profile uses in-memory H2 in PostgreSQL compatibility mode, with Flyway disabled. These tests do not substitute for integration tests against real PostgreSQL or browser end-to-end tests.

## Running tests

```bash
cd backend
./mvnw test
./mvnw verify

cd ../frontend
npm test -- --watch=false
```

JaCoCo generates the report at `target/site/jacoco/index.html` during verify. Tests exist in the repository; coverage percentages and successful runs are not claimed without a current report.

[Test source](../../backend/src/test/java/com/stickyburgers/) · [Test profile configuration](../../backend/src/test/resources/application-test.yml)
