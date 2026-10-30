import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
  private readonly destroyRef = inject(DestroyRef);

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

  constructor() {
    this.cargar();

    this.realtime.onPedidoNuevo().pipe(takeUntilDestroyed()).subscribe((p) => {
      this.pedidos.update((ps) => [p, ...ps.filter((x) => x.id !== p.id)]);
      this.snack.open(`Nuevo pedido ${p.numero}`, 'OK', { duration: 3000 });
    });

    this.realtime.onEstadoCambiado().pipe(takeUntilDestroyed()).subscribe((p) => this.reemplazar(p));
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.pedidoService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ps) => {
          this.pedidos.set(ps);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.error.set(true);
        },
      });
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
    this.pedidoService.cambiarEstado(pedido.id).subscribe({
      next: (p) => {
        this.marcar(pedido.id, false);
        this.reemplazar(p);
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
      next: () => this.pedidos.update((ps) => ps.filter((x) => x.id !== pedido.id)),
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
}
