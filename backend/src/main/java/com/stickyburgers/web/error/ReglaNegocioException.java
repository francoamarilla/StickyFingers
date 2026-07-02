package com.stickyburgers.web.error;

/** Violación de una regla de negocio (ej. máximo 6 hamburguesas, fuera de radio). Se traduce a HTTP 400. */
public class ReglaNegocioException extends RuntimeException {
    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}
