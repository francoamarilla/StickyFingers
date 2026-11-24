import { Component, computed, inject, signal } from '@angular/core';
import { EMPTY, Subject, catchError, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PedidoService } from '../../../../core/services/pedido.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { EstadoPedido, Pedido } from '../../../../core/models/pedido.model';
import { MoneyPipe } from '../../../../shared/money.pipe';

const ETIQUETAS: Record<EstadoPedido, string> = {
  NUEVO: 'NUEVO',
  EN_PREPARACION: 'EN PREPARACIÓN',
  LISTO: 'LISTO',
  ENTREGADO: 'ENTREGADO',
};

/** Texto del botón que lleva el pedido al siguiente estado. */
const ACCIONES: Record<EstadoPedido, string | null> = {
  NUEVO: 'EMPEZAR A PREPARAR',
  EN_PREPARACION: 'MARCAR LISTO',
  LISTO: 'MARCAR ENTREGADO',
  ENTREGADO: null,
};

type Filtro = 'ACTIVOS' | 'ENTREGADOS';

@Component({
  selector: 'app-pedidos',
  imports: [MoneyPipe, DatePipe],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.scss',
})
export class Pedidos {
  private readonly pedidoService = inject(PedidoService);
  private readonly realtime = inject(RealtimeService);
  private readonly snack = inject(MatSnackBar);

  readonly pedidos = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly filtro = signal<Filtro>('ACTIVOS');
  /** Pedidos con un cambio de estado en vuelo (evita doble toque). */
  readonly enCurso = signal<ReadonlySet<number>>(new Set());

  readonly activos = computed(() => this.pedidos().filter((p) => p.estado !== 'ENTREGADO'));
  readonly visibles = computed(() =>
    this.filtro() === 'ACTIVOS' ? this.activos() : this.pedidos().filter((p) => p.estado === 'ENTREGADO'),
  );

  /**
   * Cambios locales recientes, cada uno con un número de secuencia. Una respuesta REST pedida
   * en la secuencia N no pisa los cambios con secuencia mayor a N: esos son más nuevos que ella.
   * ponytail: crece con los pedidos tocados en la sesión del panel (decenas por día); podar si molesta.
   */
  private seq = 0;
  private readonly cambios = new Map<number, Cambio>();
  /** Pedidos de carga completa. switchMap deja una sola en vuelo: la más reciente. */
  private readonly recarga$ = new Subject<void>();

  constructor() {
    this.recarga$
      .pipe(
        switchMap(() => {
          const desde = this.seq;
          return this.pedidoService.listar().pipe(
            map((foto) => ({ foto, desde })),
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => {
        if (r) {
          this.pedidos.update((local) => this.fusionar(r.foto, local, r.desde));
          this.error.set(false);
        } else if (this.cargando()) {
          this.error.set(true);
        } else {
          this.snack.open('No se pudieron actualizar los pedidos', 'OK', { duration: 3000 });
        }
        this.cargando.set(false);
      });

    this.cargar();

    this.realtime
      .onPedidoNuevo()
      .pipe(
        tap((e) => this.registrar(e.id, {})),
        // desde se toma después de registrar el evento: solo cuentan los cambios posteriores.
        mergeMap((e) => {
          const desde = this.seq;
          return this.pedidoService.obtener(e.id).pipe(
            map((p) => ({ p, desde })),
            catchError(() => EMPTY),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ p, desde }) => {
        const actual = this.aplicar(p, desde);
        if (actual) {
          this.pedidos.update((ps) => [actual, ...ps.filter((x) => x.id !== p.id)]);
          this.snack.open(`Nuevo pedido ${p.numero}`, 'OK', { duration: 3000 });
        }
      });

    this.realtime
      .onEstadoCambiado()
      .pipe(takeUntilDestroyed())
      .subscribe((e) => {
        this.registrar(e.id, { estado: e.estado });
        this.pedidos.update((ps) => ps.map((x) => (x.id === e.id ? { ...x, estado: e.estado } : x)));
      });

    // Tras una caída de la conexión se pudieron perder eventos: resincronizar en segundo plano.
    this.realtime
      .onReconectado()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.recarga$.next());
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.recarga$.next();
  }

  etiqueta(estado: EstadoPedido): string {
    return ETIQUETAS[estado];
  }

  accion(estado: EstadoPedido): string | null {
    return ACCIONES[estado];
  }

  detalleItem(it: Pedido['items'][number]): string {
    return [it.medallonExtra ? 'medallón extra' : '', it.nota ?? ''].filter(Boolean).join(', ');
  }

  avanzar(pedido: Pedido): void {
    this.marcar(pedido.id, true);
    const desde = this.seq;
    this.pedidoService.cambiarEstado(pedido.id).subscribe({
      next: (p) => {
        this.marcar(pedido.id, false);
        const actual = this.aplicar(p, desde);
        if (actual) {
          this.reemplazar(actual);
        }
      },
      error: () => {
        this.marcar(pedido.id, false);
        this.snack.open('No se pudo cambiar el estado', 'OK', { duration: 3000 });
      },
    });
  }

  eliminar(pedido: Pedido): void {
    if (!confirm(`¿Eliminar el pedido ${pedido.numero}? No aparecerá más en el panel ni en los informes.`)) {
      return;
    }
    this.pedidoService.eliminar(pedido.id).subscribe({
      next: () => {
        this.registrar(pedido.id, { eliminado: true });
        this.pedidos.update((ps) => ps.filter((x) => x.id !== pedido.id));
      },
      error: () => this.snack.open('No se pudo eliminar el pedido', 'OK', { duration: 3000 }),
    });
  }

  private marcar(id: number, activo: boolean): void {
    this.enCurso.update((s) => {
      const n = new Set(s);
      if (activo) {
        n.add(id);
      } else {
        n.delete(id);
      }
      return n;
    });
  }

  private reemplazar(p: Pedido): void {
    this.pedidos.update((ps) => ps.map((x) => (x.id === p.id ? p : x)));
  }

  private registrar(id: number, cambio: Omit<Cambio, 'seq'>): void {
    this.cambios.set(id, { ...this.cambios.get(id), ...cambio, seq: ++this.seq });
  }

  /** Aplica a una respuesta REST los cambios posteriores a su envío; null si se eliminó después. */
  private aplicar(p: Pedido, desde: number): Pedido | null {
    const c = this.cambios.get(p.id);
    if (!c || c.seq <= desde) {
      return p;
    }
    if (c.eliminado) {
      return null;
    }
    return c.estado ? { ...p, estado: c.estado } : p;
  }

  /**
   * Usa la lista REST como base sin perder lo más nuevo: le aplica los cambios posteriores a
   * la consulta y conserva los pedidos locales tocados después que la lista no trae.
   */
  private fusionar(foto: Pedido[], local: Pedido[], desde: number): Pedido[] {
    const enFoto = new Set(foto.map((p) => p.id));
    const recientes = local.filter((p) => !enFoto.has(p.id) && (this.cambios.get(p.id)?.seq ?? 0) > desde);
    const base = foto.map((p) => this.aplicar(p, desde)).filter((p): p is Pedido => p !== null);
    return [...recientes, ...base];
  }
}

/** Cambio local conocido de un pedido (evento WS o acción del panel). */
interface Cambio {
  seq: number;
  estado?: EstadoPedido;
  eliminado?: boolean;
}
