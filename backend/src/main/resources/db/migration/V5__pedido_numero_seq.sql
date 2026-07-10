-- Numeración de pedidos por secuencia atómica. Antes se usaba count()+1, que bajo dos
-- creaciones concurrentes leía el mismo total y generaba el mismo numero -> chocaba con el
-- UNIQUE. nextval() entrega valores distintos sin importar aislamiento ni orden de commit.
CREATE SEQUENCE pedido_numero_seq;

-- Continuar donde venía la numeración: el próximo pedido toma count()+1 (nunca hubo borrado
-- físico, así que la numeración es contigua y count = último número asignado).
SELECT setval('pedido_numero_seq', (SELECT COUNT(*) FROM pedido) + 1, false);
