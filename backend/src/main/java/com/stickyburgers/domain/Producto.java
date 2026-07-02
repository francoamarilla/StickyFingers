package com.stickyburgers.domain;

import jakarta.persistence.*;
import lombok.*;

/** Producto del menú: hamburguesa o extra. */
@Entity
@Table(name = "producto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoProducto tipo;

    @Column(nullable = false, length = 80)
    private String nombre;

    @Column(columnDefinition = "text")
    private String descripcion;

    /** Precio en pesos enteros (ARS). */
    @Column(nullable = false)
    private Integer precio;

    @Column(nullable = false)
    private boolean disponible;
}
