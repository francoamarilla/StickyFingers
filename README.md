# Sticky Burgers

Sistema de gestión de pedidos para una hamburguesería, con carta y checkout para el cliente y un panel de gestión para el local (pedidos en tiempo real, ofertas e informes de ventas).

El detalle completo del stack, la arquitectura y los objetivos está en [`CLAUDE.md`](./CLAUDE.md).

## Estructura del repositorio

```text
StickyFingers/
├── backend/     # API REST — Spring Boot 3 / Java 21 (en construcción)
├── frontend/    # Prototipo de UI en HTML/CSS/JS vanilla (será migrado a Angular)
└── CLAUDE.md    # Stack tecnológico, arquitectura y buenas prácticas
```

## Frontend (prototipo)

Prototipo funcional traducido desde Claude Design. Toda la lógica y la persistencia viven en el navegador (`localStorage`). Sirve como referencia de dominio y de UI mientras se construye el backend.

Para verlo, servir la carpeta `frontend/` con cualquier servidor estático, por ejemplo:

```bash
cd frontend && python -m http.server 8000
# o
npx serve frontend
```

## Backend

En construcción siguiendo el plan por pasos (cada paso = issue + rama + PR). Ver `backend/README.md` a medida que avanza.

Reglas de negocio clave:

- Máximo 6 hamburguesas por pedido.
- Medallón extra: +$3500 por unidad.
- Medios de pago: **efectivo** o **transferencia**, sin recargo.
- Entrega: retiro en local o delivery (costo por distancia, con recargo por lluvia; radio máximo 3 km).
- Estados de pedido: `NUEVO → EN_PREPARACION → LISTO → ENTREGADO`.
