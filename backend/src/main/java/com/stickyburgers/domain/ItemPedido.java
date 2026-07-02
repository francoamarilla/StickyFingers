package com.stickyburgers.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * Línea de un pedido. Guarda un snapshot de nombre y precio del producto
 * al momento de la compra, para que cambios futuros del menú no alteren pedidos históricos.
 */
@Entity
@Table(name = "item_pedido")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;

    /** Referencia al producto del menú (puede quedar null si el producto se elimina). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id")
    private Producto producto;

    @Column(nullable = false, length = 80)
    private String nombre;

    /** Precio base del producto en el momento del pedido (sin medallón), en pesos enteros. */
    @Column(name = "precio_unitario", nullable = false)
    private Integer precioUnitario;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "medallon_extra", nullable = false)
    private boolean medallonExtra;

    @Column(length = 200)
    private String nota;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_linea", nullable = false, length = 20)
    private TipoLinea tipoLinea;
}
