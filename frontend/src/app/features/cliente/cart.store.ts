import { Injectable, computed, signal } from '@angular/core';
import { Producto } from '../../core/models/menu.model';
import { ItemPedidoRequest, MedioPago, TipoEntrega } from '../../core/models/pedido.model';
import { MAX_HAMBURGUESAS, MEDALLON_PRECIO } from '../../core/constants';

export interface CartLine {
  lineId: string;
  producto: Producto;
  cantidad: number;
  medallonExtra: boolean;
  nota: string;
}

export interface DatosEntrega {
  clienteNombre: string;
  clienteTelefono: string;
  tipoEntrega: TipoEntrega;
  direccion: string;
  km: number | null;
  lluvia: boolean;
  medioPago: MedioPago;
  notaGeneral: string;
}

const ENTREGA_INICIAL: DatosEntrega = {
  clienteNombre: '',
  clienteTelefono: '',
  tipoEntrega: 'RETIRO',
  direccion: '',
  km: null,
  lluvia: false,
  medioPago: 'EFECTIVO',
  notaGeneral: '',
};

/** Estado del carrito y los datos de entrega del cliente. */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _lines = signal<CartLine[]>([]);
  readonly lines = this._lines.asReadonly();

  readonly entrega = signal<DatosEntrega>({ ...ENTREGA_INICIAL });

  readonly cantidadItems = computed(() => this._lines().reduce((a, l) => a + l.cantidad, 0));

  readonly cantidadHamburguesas = computed(() =>
    this._lines()
      .filter((l) => l.producto.tipo === 'HAMBURGUESA')
      .reduce((a, l) => a + l.cantidad, 0),
  );

  readonly subtotal = computed(() =>
    this._lines().reduce((a, l) => a + this.precioLinea(l), 0),
  );

  readonly vacio = computed(() => this._lines().length === 0);

  precioUnitario(line: CartLine): number {
    const medallon = line.producto.tipo === 'HAMBURGUESA' && line.medallonExtra ? MEDALLON_PRECIO : 0;
    return line.producto.precio + medallon;
  }

  precioLinea(line: CartLine): number {
    return this.precioUnitario(line) * line.cantidad;
  }

  /** Cupo de hamburguesas restante para no superar el máximo. */
  cupoHamburguesas(): number {
    return MAX_HAMBURGUESAS - this.cantidadHamburguesas();
  }

  agregarHamburguesa(producto: Producto, cantidad: number, medallonExtra: boolean, nota: string): void {
    const line: CartLine = { lineId: this.nuevoId(), producto, cantidad, medallonExtra, nota: nota.trim() };
    this._lines.update((ls) => [...ls, line]);
  }

  agregarExtra(producto: Producto): void {
    const existente = this._lines().find((l) => l.producto.tipo === 'EXTRA' && l.producto.id === producto.id);
    if (existente) {
      this.incrementar(existente.lineId);
      return;
    }
    const line: CartLine = { lineId: this.nuevoId(), producto, cantidad: 1, medallonExtra: false, nota: '' };
    this._lines.update((ls) => [...ls, line]);
  }

  incrementar(lineId: string): void {
    this._lines.update((ls) =>
      ls.map((l) => (l.lineId === lineId ? { ...l, cantidad: l.cantidad + 1 } : l)),
    );
  }

  decrementar(lineId: string): void {
    this._lines.update((ls) =>
      ls
        .map((l) => (l.lineId === lineId ? { ...l, cantidad: l.cantidad - 1 } : l))
        .filter((l) => l.cantidad > 0),
    );
  }

  quitar(lineId: string): void {
    this._lines.update((ls) => ls.filter((l) => l.lineId !== lineId));
  }

  limpiar(): void {
    this._lines.set([]);
    this.entrega.set({ ...ENTREGA_INICIAL });
  }

  /** Convierte las líneas al formato que espera el backend. */
  toItemsRequest(): ItemPedidoRequest[] {
    return this._lines().map((l) => ({
      productoId: l.producto.id,
      cantidad: l.cantidad,
      medallonExtra: l.medallonExtra,
      nota: l.nota || null,
    }));
  }

  private nuevoId(): string {
    return `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  }
}
