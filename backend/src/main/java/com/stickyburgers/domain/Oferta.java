package com.stickyburgers.domain;

import jakarta.persistence.*;
import lombok.*;

/** Oferta promocional gestionada desde el panel del local. */
@Entity
@Table(name = "oferta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Oferta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(columnDefinition = "text")
    private String descripcion;

    /** Precio promocional en pesos enteros (ARS). */
    @Column(nullable = false)
    private Integer precio;

    @Column(length = 60)
    private String vigencia;

    @Column(nullable = false)
    private boolean activa;
}
