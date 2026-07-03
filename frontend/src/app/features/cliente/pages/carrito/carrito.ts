import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartStore, CartLine } from '../../cart.store';
import { MoneyPipe } from '../../../../shared/money.pipe';
import { MAX_HAMBURGUESAS } from '../../../../core/constants';

@Component({
  selector: 'app-carrito',
  imports: [MoneyPipe],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss',
})
export class Carrito {
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  readonly cart = inject(CartStore);

  readonly maxHamburguesas = MAX_HAMBURGUESAS;
  readonly progreso = computed(() =>
    Math.min(100, (this.cart.cantidadHamburguesas() / MAX_HAMBURGUESAS) * 100),
  );

  incrementar(line: CartLine): void {
    if (line.producto.tipo === 'HAMBURGUESA' && this.cart.cantidadHamburguesas() >= MAX_HAMBURGUESAS) {
      this.snack.open(`Máximo ${MAX_HAMBURGUESAS} hamburguesas por pedido`, 'OK', { duration: 2500 });
      return;
    }
    this.cart.incrementar(line.lineId);
  }

  decrementar(line: CartLine): void {
    this.cart.decrementar(line.lineId);
  }

  quitar(line: CartLine): void {
    this.cart.quitar(line.lineId);
  }

  volver(): void {
    this.router.navigate(['/']);
  }

  continuar(): void {
    this.router.navigate(['/checkout']);
  }
}
