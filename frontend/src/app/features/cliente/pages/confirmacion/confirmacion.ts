import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LastOrderStore } from '../../last-order.store';
import { MoneyPipe } from '../../../../shared/money.pipe';
import { WA_NUMERO } from '../../../../core/constants';
import { Pedido } from '../../../../core/models/pedido.model';

@Component({
  selector: 'app-confirmacion',
  imports: [MoneyPipe],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.scss',
})
export class Confirmacion {
  private readonly router = inject(Router);
  private readonly store = inject(LastOrderStore);

  readonly pedido = this.store.pedido;

  readonly waLink = computed(() => {
    const p = this.pedido();
    return p ? this.construirWhatsApp(p) : '#';
  });

  constructor() {
    if (!this.store.pedido()) {
      this.router.navigate(['/']);
    }
  }

  otroPedido(): void {
    this.store.pedido.set(null);
    this.router.navigate(['/']);
  }

  private construirWhatsApp(p: Pedido): string {
    const L: string[] = [
      `*PEDIDO · STICKY BURGERS* ${p.numero}`,
      '',
      `Cliente: ${p.clienteNombre}`,
      `Tel: ${p.clienteTelefono}`,
      `Entrega: ${p.tipoEntrega === 'DELIVERY' ? `Delivery — ${p.direccion}` : 'Retiro en local'}`,
      '',
    ];
    for (const it of p.items) {
      const det = [it.medallonExtra ? 'medallón extra' : '', it.nota ?? ''].filter(Boolean).join(', ');
      L.push(`• ${it.cantidad}x ${it.nombre}${det ? ` — ${det}` : ''}`);
    }
    L.push('');
    L.push(`Subtotal: $${p.subtotal.toLocaleString('es-AR')}`);
    if (p.tipoEntrega === 'DELIVERY') {
      L.push('Envío: a coordinar');
    }
    L.push(`TOTAL: $${p.total.toLocaleString('es-AR')}`);
    L.push(`Pago: ${p.medioPago === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}`);
    if (p.notaGeneral) {
      L.push('', `Nota: ${p.notaGeneral}`);
    }
    return `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(L.join('\n'))}`;
  }
}
