import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PedidoService } from '../../../../core/services/pedido.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { EstadoPedido, Pedido } from '../../../../core/models/pedido.model';
import { MoneyPipe } from '../../../../shared/money.pipe';

interface EstadoInfo {
  label: string;
  color: string;
}

const ESTADOS: Record<EstadoPedido, EstadoInfo> = {
  NUEVO: { label: 'NUEVO', color: '#e11b22' },
  EN_PREPARACION: { label: 'EN PREP.', color: '#ffc400' },
  LISTO: { label: 'LISTO', color: '#39b34a' },
  ENTREGADO: { label: 'ENTREGADO', color: '#6f6860' },
};

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

  constructor() {
    this.pedidoService.listar().pipe(takeUntilDestroyed()).subscribe({
      next: (ps) => {
        this.pedidos.set(ps);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });

    this.realtime.onPedidoNuevo().pipe(takeUntilDestroyed()).subscribe((p) => {
      this.pedidos.update((ps) => [p, ...ps.filter((x) => x.id !== p.id)]);
      this.snack.open(`Nuevo pedido ${p.numero}`, 'OK', { duration: 3000 });
    });

    this.realtime.onEstadoCambiado().pipe(takeUntilDestroyed()).subscribe((p) => this.reemplazar(p));
  }

  estadoInfo(estado: EstadoPedido): EstadoInfo {
    return ESTADOS[estado];
  }

  detalleItem(it: Pedido['items'][number]): string {
    return [it.medallonExtra ? 'medallón extra' : '', it.nota ?? ''].filter(Boolean).join(', ');
  }

  avanzar(pedido: Pedido): void {
    this.pedidoService.cambiarEstado(pedido.id).subscribe({
      next: (p) => this.reemplazar(p),
      error: () => this.snack.open('No se pudo cambiar el estado', 'OK', { duration: 3000 }),
    });
  }

  private reemplazar(p: Pedido): void {
    this.pedidos.update((ps) => ps.map((x) => (x.id === p.id ? p : x)));
  }
}
