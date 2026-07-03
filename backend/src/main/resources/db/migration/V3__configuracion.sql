-- Configuración global del local (fila única). Por ahora sólo el flag de lluvia,
-- que controla el admin desde el panel y afecta el costo de delivery.
CREATE TABLE configuracion (
    id     BIGINT PRIMARY KEY,
    lluvia BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO configuracion (id, lluvia) VALUES (1, FALSE);
