import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { EstadoPedido, Pedido, PedidoEvento } from '../../../../core/models/pedido.model';
import { PedidoService } from '../../../../core/services/pedido.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { Pedidos } from './pedidos';

function pedido(id: number, estado: EstadoPedido = 'NUEVO'): Pedido {
  return {
    id, numero: `#${id}`, fecha: '2026-11-24T12:00:00Z', clienteNombre: 'Ana', clienteTelefono: '1',
    tipoEntrega: 'RETIRO', direccion: null, km: null, lluvia: false, subtotal: 1, costoEnvio: 0,
    total: 1, medioPago: 'EFECTIVO', notaGeneral: null, estado, items: [],
  };
}

describe('Pedidos: sincronización REST + WebSocket', () => {
  /** Cada llamada a listar() / obtener() queda pendiente hasta que el test responde. */
  let listar: Subject<Pedido[]>[];
  let obtener: Map<number, Subject<Pedido>>;
  let nuevo$: Subject<PedidoEvento>;
  let estado$: Subject<PedidoEvento>;
  let reconectado$: Subject<void>;

  function crear(): Pedidos {
    return TestBed.createComponent(Pedidos).componentInstance;
  }

  function estados(c: Pedidos): Record<number, EstadoPedido> {
    return Object.fromEntries(c.pedidos().map((p) => [p.id, p.estado]));
  }

  beforeEach(() => {
    listar = [];
    obtener = new Map();
    nuevo$ = new Subject();
    estado$ = new Subject();
    reconectado$ = new Subject();
    TestBed.configureTestingModule({
      imports: [Pedidos],
      providers: [
        {
          provide: PedidoService,
          useValue: {
            listar: () => {
              const s = new Subject<Pedido[]>();
              listar.push(s);
              return s;
            },
            obtener: (id: number) => {
              const s = new Subject<Pedido>();
              obtener.set(id, s);
              return s;
            },
          },
        },
        {
          provide: RealtimeService,
          useValue: { onPedidoNuevo: () => nuevo$, onEstadoCambiado: () => estado$, onReconectado: () => reconectado$ },
        },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    });
  });

  it('un cambio de estado recibido durante la carga no lo pisa la respuesta vieja', () => {
    const c = crear();
    estado$.next({ id: 1, estado: 'LISTO' });
    listar[0].next([pedido(1, 'NUEVO')]);
    expect(estados(c)).toEqual({ 1: 'LISTO' });
  });

  it('respeta cambios de estado no crecientes (retroceso) frente a una foto desactualizada', () => {
    const c = crear();
    listar[0].next([pedido(1, 'LISTO')]);
    reconectado$.next();
    estado$.next({ id: 1, estado: 'NUEVO' });
    listar[1].next([pedido(1, 'LISTO')]);
    expect(estados(c)).toEqual({ 1: 'NUEVO' });
  });

  it('un pedido nuevo que todavía no estaba local y llega durante la carga se conserva sin duplicar', () => {
    const c = crear();
    nuevo$.next({ id: 2, estado: 'NUEVO' });
    obtener.get(2)!.next(pedido(2));
    listar[0].next([pedido(1)]); // la foto no trae el 2
    expect(c.pedidos().map((p) => p.id)).toEqual([2, 1]);

    reconectado$.next();
    listar[1].next([pedido(2), pedido(1)]); // ahora sí lo trae: aparece una sola vez
    expect(c.pedidos().map((p) => p.id)).toEqual([2, 1]);
  });

  it('un cambio de estado de un pedido cuyo detalle está pendiente se aplica al llegar el detalle', () => {
    const c = crear();
    listar[0].next([]);
    nuevo$.next({ id: 3, estado: 'NUEVO' });
    estado$.next({ id: 3, estado: 'EN_PREPARACION' }); // llega antes que GET /{id}
    obtener.get(3)!.next(pedido(3, 'NUEVO'));
    expect(estados(c)).toEqual({ 3: 'EN_PREPARACION' });
  });

  it('el evento del pedido nuevo no retrocede un estado más avanzado del detalle', () => {
    const c = crear();
    listar[0].next([]);
    nuevo$.next({ id: 4, estado: 'NUEVO' });
    obtener.get(4)!.next(pedido(4, 'LISTO'));
    expect(estados(c)).toEqual({ 4: 'LISTO' });
  });

  it('reconexiones seguidas dejan una sola carga en vuelo y gana la última', () => {
    const c = crear();
    listar[0].next([pedido(1)]);
    reconectado$.next();
    reconectado$.next();
    expect(listar.length).toBe(3);
    expect(listar[1].observed).toBe(false); // cancelada por switchMap
    expect(listar[2].observed).toBe(true);
    listar[2].next([pedido(1, 'ENTREGADO'), pedido(5)]);
    expect(estados(c)).toEqual({ 1: 'ENTREGADO', 5: 'NUEVO' });
  });

  it('si falla una recarga de fondo conserva la lista y no muestra la pantalla de error', () => {
    const c = crear();
    listar[0].next([pedido(1)]);
    reconectado$.next();
    listar[1].error(new Error('red'));
    expect(c.pedidos().map((p) => p.id)).toEqual([1]);
    expect(c.error()).toBe(false);
    reconectado$.next(); // el flujo sigue vivo después del error
    expect(listar.length).toBe(3);
  });
});
