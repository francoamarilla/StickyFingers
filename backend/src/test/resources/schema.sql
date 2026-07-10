-- Tests corren con Flyway desactivado y Hibernate create-drop, que no crea secuencias sueltas.
-- La numeración de pedidos usa esta secuencia (ver V5__pedido_numero_seq.sql en prod).
CREATE SEQUENCE IF NOT EXISTS pedido_numero_seq;
