-- Borrado lógico de pedidos: el admin los oculta del panel y de los informes,
-- pero la fila queda para no romper la numeración ni el historial.
ALTER TABLE pedido ADD COLUMN eliminado BOOLEAN NOT NULL DEFAULT FALSE;
