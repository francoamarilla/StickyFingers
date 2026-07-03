import { Injectable, computed, signal } from '@angular/core';
import { Producto } from '../../core/models/menu.model';
import { Oferta } from '../../core/models/oferta.model';
import { ItemPedidoRequest, MedioPago, TipoEntrega } from '../../core/models/pedido.model';
import { MAX_HAMBURGUESAS, MEDALLON_PRECIO } from '../../core/constants';

export type CartItemTipo = 'HAMBURGUESA' | 'EXTRA' | 'OFERTA';

/** Línea del carrito. Referencia un producto del menú o una oferta (precio fijo). */
export interface CartLine {
  lineId: string;
  tipo: CartItemTipo;
  /** id del producto o de la oferta según `esOferta`. */
  refId: number;
  esOferta: boolean;
  nombre: string;
  precioBase: number;
  cantidad: number;
  medallonExtra: boolean;
  nota: string;
}

export interface DatosEntrega {
  clienteNombre: string;
  clienteTelefono: string;
  tipoEntrega: TipoEntrega;
  direccion: string;
  lat: number | null;
  lng: number | null;
  medioPago: MedioPago;
  notaGeneral: string;
}

const ENTREGA_INICIAL: DatosEntrega = {
  clienteNombre: '',
  clienteTelefono: '',
  tipoEntrega: 'RETIRO',
  direccion: '',
  lat: null,
  lng: null,
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
      .filter((l) => l.tipo === 'HAMBURGUESA')
      .reduce((a, l) => a + l.cantidad, 0),
  );

  readonly subtotal = computed(() =>
    this._lines().reduce((a, l) => a + this.precioLinea(l), 0),
  );

  readonly vacio = computed(() => this._lines().length === 0);

  precioUnitario(line: CartLine): number {
    const medallon = line.tipo === 'HAMBURGUESA' && line.medallonExtra ? MEDALLON_PRECIO : 0;
    return line.precioBase + medallon;
  }

  precioLinea(line: CartLine): number {
    return this.precioUnitario(line) * line.cantidad;
  }

  /** Cupo de hamburguesas restante para no superar el máximo. */
  cupoHamburguesas(): number {
    return MAX_HAMBURGUESAS - this.cantidadHamburguesas();
  }

  agregarHamburguesa(producto: Producto, cantidad: number, medallonExtra: boolean, nota: string): void {
    const line: CartLine = {
      lineId: this.nuevoId(),
      tipo: 'HAMBURGUESA',
      refId: producto.id,
      esOferta: false,
      nombre: producto.nombre,
      precioBase: producto.precio,
      cantidad,
      medallonExtra,
      nota: nota.trim(),
    };
    this._lines.update((ls) => [...ls, line]);
  }

  agregarExtra(producto: Producto): void {
    const existente = this._lines().find((l) => l.tipo === 'EXTRA' && l.refId === producto.id);
    if (existente) {
      this.incrementar(existente.lineId);
      return;
    }
    this._lines.update((ls) => [...ls, this.lineaSimple('EXTRA', producto.id, producto.nombre, producto.precio)]);
  }

  agregarOferta(oferta: Oferta): void {
    const existente = this._lines().find((l) => l.tipo === 'OFERTA' && l.refId === oferta.id);
    if (existente) {
      this.incrementar(existente.lineId);
      return;
    }
    this._lines.update((ls) => [...ls, this.lineaSimple('OFERTA', oferta.id, oferta.titulo, oferta.precio)]);
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
    return this._lines().map((l) =>
      l.esOferta
        ? { ofertaId: l.refId, cantidad: l.cantidad, medallonExtra: false, nota: l.nota || null }
        : { productoId: l.refId, cantidad: l.cantidad, medallonExtra: l.medallonExtra, nota: l.nota || null },
    );
  }

  private lineaSimple(tipo: CartItemTipo, refId: number, nombre: string, precioBase: number): CartLine {
    return {
      lineId: this.nuevoId(),
      tipo,
      refId,
      esOferta: tipo === 'OFERTA',
      nombre,
      precioBase,
      cantidad: 1,
      medallonExtra: false,
      nota: '',
    };
  }

  private nuevoId(): string {
    return `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  }
}
