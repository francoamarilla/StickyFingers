# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Cliente (comprador):** llega desde un link (Instagram/WhatsApp) en el celular, arma su pedido rápido sin crear cuenta ni iniciar sesión, y lo confirma enviándolo por WhatsApp. Mobile es el caso principal.
- **Admin (dueño del local):** único rol autenticado. Gestiona todo desde su celular: ve los pedidos entrar en tiempo real, avanza sus estados, administra carta y ofertas, y consulta informes de ventas.

## Product Purpose

Sistema de pedidos para una hamburguesería: carta + carrito + checkout para el cliente, y un panel de gestión para el local. Es una pieza de **portfolio/demo** (el local es ficticio) que tiene que demostrar desarrollo full-stack profesional: Spring Boot, Angular, REST, WebSockets, seguridad JWT, testing y Docker. Está en producción en https://stickyfingers.me.

Éxito: un cliente completa un pedido desde el celular en pocos toques sin fricción, y el admin opera el local desde el teléfono sin refrescar; quien evalúa el proyecto lo percibe como producto real, no como ejercicio.

## Positioning

Pedido directo al local sin app ni cuenta, con confirmación por WhatsApp y un panel en tiempo real para el dueño, en un solo sistema.

## Operating Context

- Cliente en `/`: carta → personalización (medallón extra) → carrito → checkout → confirmación → enviar por WhatsApp.
- Panel en `/panel` (login en `/panel/login`): pedidos en tiempo real, carta, ofertas, informes. Los clientes no tienen ningún enlace al panel; se entra solo escribiendo la URL.
- Estados de pedido: `NUEVO → EN_PREPARACION → LISTO → ENTREGADO`. Las pantallas se actualizan por WebSocket (STOMP).

## Capabilities and Constraints

- Máximo 6 hamburguesas por pedido. Medallón extra: +$3500 por unidad.
- Medios de pago: solo **efectivo** o **transferencia**, sin recargo. Total = subtotal + envío.
- Entrega: retiro en local o delivery (costo por distancia, radio máximo 3 km, recargo por lluvia que el admin activa desde el panel).
- Moneda ARS.
- Ofertas: el admin las crea y aparecen primero en la carta, en su propia sección "Ofertas"; debería generar imagen 9:16 para estados de WhatsApp (pendiente, ver `PROBLEMAS.md`).
- La dirección del local no se muestra a clientes por ahora.
- Stack fijado en `CLAUDE.md` (Angular + Angular Material + Signals en el frontend).

## Brand Commitments

- Nombre: **Sticky Burgers** (el repo se llama StickyFingers).
- Logo en `frontend/public/logo.png` (debe verse completo; hoy aparece recortado, ver `PROBLEMAS.md`).
- Voz: español rioplatense con voseo ("coordina con vos"), directa y corta.

## Evidence on Hand

- Capturas del panel en `docs/` (pedidos, carta, ofertas, informes).
- Imagen de ejemplo en `frontend/public/EjImagen.png`.
- No hay clientes, reseñas, testimonios ni métricas reales: el local es ficticio. No inventarlos.

## Product Principles

1. **El celular es el producto.** Cliente y admin usan el teléfono; todo se diseña y valida primero a ancho mobile.
2. **Pedir sin fricción.** Sin cuenta, sin pasos de más; las reglas del negocio (límite de 6, recargos) se comunican en el momento, no como error al final.
3. **El panel se lee de un vistazo.** El dueño atiende con una mano mientras cocina: el estado de cada pedido y la próxima acción tienen que ser obvios.
4. **Calidad de producto real.** Es portfolio: cada estado (carga, vacío, error, tiempo real) tiene que estar resuelto, como en un producto en producción.
