package com.stickyburgers.domain;

import jakarta.persistence.*;
import lombok.*;

/** Configuración global del local (fila única, id = 1). */
@Entity
@Table(name = "configuracion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Configuracion {

    /** Identificador de la fila única de configuración. */
    public static final Long ID_UNICO = 1L;

    @Id
    private Long id;

    /** Indica si está lloviendo; lo activa el admin y encarece el delivery. */
    @Column(nullable = false)
    private boolean lluvia;
}
