import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartStore } from '../../cart.store';
import { LastOrderStore } from '../../last-order.store';
import { PedidoService } from '../../../../core/services/pedido.service';
import { MedioPago, TipoEntrega, CrearPedidoRequest } from '../../../../core/models/pedido.model';
import { MoneyPipe } from '../../../../shared/money.pipe';
import { estimarCostoEnvio, estimarKm } from '../../../../core/delivery.util';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, MoneyPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly pedidoService = inject(PedidoService);
  private readonly lastOrder = inject(LastOrderStore);
  readonly cart = inject(CartStore);

  readonly nombre = signal('');
  readonly telefono = signal('');
  readonly tipoEntrega = signal<TipoEntrega>('RETIRO');
  readonly direccion = signal('');
  readonly lluvia = signal(false);
  readonly medioPago = signal<MedioPago>('EFECTIVO');
  readonly notaGeneral = signal('');
  readonly enviando = signal(false);

  readonly esDelivery = computed(() => this.tipoEntrega() === 'DELIVERY');

  readonly km = computed(() =>
    this.esDelivery() && this.direccion().trim() ? estimarKm(this.direccion()) : null,
  );

  /** null = fuera de radio. */
  readonly costoEnvio = computed(() => {
    const km = this.km();
    if (!this.esDelivery() || km === null) {
      return 0;
    }
    return estimarCostoEnvio(km, this.lluvia());
  });

  readonly fueraRadio = computed(() => this.esDelivery() && this.km() !== null && this.costoEnvio() === null);

  readonly total = computed(() => this.cart.subtotal() + (this.costoEnvio() ?? 0));

  readonly puedeConfirmar = computed(() => {
    if (this.cart.vacio() || !this.nombre().trim() || !this.telefono().trim()) {
      return false;
    }
    if (this.esDelivery() && (!this.direccion().trim() || this.fueraRadio())) {
      return false;
    }
    return !this.enviando();
  });

  setEntrega(tipo: TipoEntrega): void {
    this.tipoEntrega.set(tipo);
  }

  setPago(medio: MedioPago): void {
    this.medioPago.set(medio);
  }

  volver(): void {
    this.router.navigate(['/carrito']);
  }

  confirmar(): void {
    if (!this.puedeConfirmar()) {
      return;
    }
    this.enviando.set(true);
    const req: CrearPedidoRequest = {
      clienteNombre: this.nombre().trim(),
      clienteTelefono: this.telefono().trim(),
      tipoEntrega: this.tipoEntrega(),
      direccion: this.esDelivery() ? this.direccion().trim() : null,
      km: this.esDelivery() ? this.km() : null,
      lluvia: this.lluvia(),
      medioPago: this.medioPago(),
      notaGeneral: this.notaGeneral().trim() || null,
      items: this.cart.toItemsRequest(),
    };

    this.pedidoService.crear(req).subscribe({
      next: (pedido) => {
        this.lastOrder.pedido.set(pedido);
        this.cart.limpiar();
        this.router.navigate(['/confirmacion']);
      },
      error: (err) => {
        this.enviando.set(false);
        const msg = err?.error?.message ?? 'No se pudo confirmar el pedido';
        this.snack.open(msg, 'OK', { duration: 3500 });
      },
    });
  }
}
