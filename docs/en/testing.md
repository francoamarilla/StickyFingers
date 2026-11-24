# Automated testing

[Versión en español](../testing.md) · [README](../../README.md)

## Scope

| Suite | Type and representative cases |
|---|---|
| PedidoServiceTest | Unit tests with Mockito: subtotals, extras, delivery, burger limits, event publishing and state progression. |
| CostoEnvioServiceTest | Unit and parameterized tests: pickup, distance bands and rain, distance validation. |
| PedidoFlowIntegrationTest | Spring Boot Test and MockMvc: public menu, order creation, invalid quantities, authentication, admin access and soft deletion without reusing numbers. |

The integration profile uses in-memory H2 in PostgreSQL compatibility mode, with Flyway disabled. These tests do not substitute for integration tests against real PostgreSQL or end-to-end WebSocket tests.

## Running tests

```bash
cd backend
./mvnw test
./mvnw verify
```

JaCoCo generates the report at `target/site/jacoco/index.html` during verify. Tests exist in the repository; coverage percentages and successful runs are not claimed without a current report.

[Test source](../../backend/src/test/java/com/stickyburgers/) · [Test profile configuration](../../backend/src/test/resources/application-test.yml)
