package com.stickyburgers.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Pedido realizado por un cliente. Los importes se calculan en el servidor. */
@Entity
@Table(name = "pedido")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Número visible del pedido, ej. "#001". */
    @Column(nullable = false, unique = true, length = 10)
    private String numero;

    @Column(nullable = false)
    private Instant fecha;

    @Column(name = "cliente_nombre", nullable = false, length = 120)
    private String clienteNombre;

    @Column(name = "cliente_telefono", nullable = false, length = 40)
    private String clienteTelefono;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_entrega", nullable = false, length = 20)
    private TipoEntrega tipoEntrega;

    @Column(length = 200)
    private String direccion;

    /** Distancia estimada al domicilio (solo delivery). */
    @Column(precision = 4, scale = 2)
    private BigDecimal km;

    @Column(nullable = false)
    private boolean lluvia;

    @Column(nullable = false)
    private Integer subtotal;

    @Column(name = "costo_envio", nullable = false)
    private Integer costoEnvio;

    @Column(nullable = false)
    private Integer total;

    @Enumerated(EnumType.STRING)
    @Column(name = "medio_pago", nullable = false, length = 20)
    private MedioPago medioPago;

    @Column(name = "nota_general", columnDefinition = "text")
    private String notaGeneral;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPedido estado;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<ItemPedido> items = new ArrayList<>();

    /** Agrega una línea manteniendo la relación bidireccional. */
    public void addItem(ItemPedido item) {
        item.setPedido(this);
        items.add(item);
    }
}
