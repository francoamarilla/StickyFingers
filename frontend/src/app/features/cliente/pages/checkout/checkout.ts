import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartStore } from '../../cart.store';
import { LastOrderStore } from '../../last-order.store';
import { PedidoService } from '../../../../core/services/pedido.service';
import { ConfigService } from '../../../../core/services/config.service';
import { MedioPago, TipoEntrega, CrearPedidoRequest } from '../../../../core/models/pedido.model';
import { MoneyPipe } from '../../../../shared/money.pipe';
import { estimarCostoEnvio, geocodificar, haversineKm } from '../../../../core/delivery.util';

type GeoEstado = 'idle' | 'buscando' | 'ok' | 'no-encontrada';

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
  private readonly config = inject(ConfigService);
  private readonly lastOrder = inject(LastOrderStore);
  readonly cart = inject(CartStore);

  readonly nombre = signal('');
  readonly telefono = signal('');
  readonly tipoEntrega = signal<TipoEntrega>('RETIRO');
  readonly direccion = signal('');
  readonly medioPago = signal<MedioPago>('EFECTIVO');
  readonly notaGeneral = signal('');
  readonly enviando = signal(false);

  /** Flag global de lluvia (lo controla el admin). */
  readonly lluvia = signal(false);

  /** Geocodificación de la dirección. */
  readonly geoEstado = signal<GeoEstado>('idle');
  private readonly lat = signal<number | null>(null);
  private readonly lng = signal<number | null>(null);
  readonly km = signal<number | null>(null);
  private geoTimer: ReturnType<typeof setTimeout> | null = null;

  readonly esDelivery = computed(() => this.tipoEntrega() === 'DELIVERY');

  /** null = fuera de radio. */
  readonly costoEnvio = computed(() => {
    const km = this.km();
    if (!this.esDelivery() || km === null) {
      return 0;
    }
    return estimarCostoEnvio(km, this.lluvia());
  });

  readonly fueraRadio = computed(
    () => this.esDelivery() && this.km() !== null && this.costoEnvio() === null,
  );

  readonly total = computed(() => this.cart.subtotal() + (this.costoEnvio() ?? 0));

  readonly puedeConfirmar = computed(() => {
    if (this.cart.vacio() || !this.nombre().trim() || !this.telefono().trim()) {
      return false;
    }
    if (this.esDelivery()) {
      if (!this.direccion().trim() || this.geoEstado() !== 'ok' || this.fueraRadio()) {
        return false;
      }
    }
    return !this.enviando();
  });

  constructor() {
    this.config.obtener().subscribe((c) => this.lluvia.set(c.lluvia));
  }

  setEntrega(tipo: TipoEntrega): void {
    this.tipoEntrega.set(tipo);
    if (tipo === 'RETIRO') {
      this.resetGeo();
    } else if (this.direccion().trim()) {
      this.programarGeocodificacion();
    }
  }

  setPago(medio: MedioPago): void {
    this.medioPago.set(medio);
  }

  onDireccion(valor: string): void {
    this.direccion.set(valor);
    this.programarGeocodificacion();
  }

  private programarGeocodificacion(): void {
    if (this.geoTimer) {
      clearTimeout(this.geoTimer);
    }
    const dir = this.direccion().trim();
    if (!this.esDelivery() || !dir) {
      this.resetGeo();
      return;
    }
    this.geoEstado.set('buscando');
    this.geoTimer = setTimeout(() => this.geocodificar(dir), 600);
  }

  private async geocodificar(dir: string): Promise<void> {
    const coords = await geocodificar(dir);
    // Ignorar si la dirección cambió mientras buscábamos.
    if (dir !== this.direccion().trim()) {
      return;
    }
    if (!coords) {
      this.resetGeo();
      this.geoEstado.set('no-encontrada');
      return;
    }
    this.lat.set(coords.lat);
    this.lng.set(coords.lng);
    this.km.set(haversineKm(coords.lat, coords.lng));
    this.geoEstado.set('ok');
  }

  private resetGeo(): void {
    this.lat.set(null);
    this.lng.set(null);
    this.km.set(null);
    this.geoEstado.set('idle');
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
      lat: this.esDelivery() ? this.lat() : null,
      lng: this.esDelivery() ? this.lng() : null,
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
