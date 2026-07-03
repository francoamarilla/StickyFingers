import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MenuService } from '../../../../core/services/menu.service';
import { OfertaService } from '../../../../core/services/oferta.service';
import { Producto } from '../../../../core/models/menu.model';
import { Oferta } from '../../../../core/models/oferta.model';
import { CartStore } from '../../cart.store';
import { MoneyPipe } from '../../../../shared/money.pipe';
import { MAX_HAMBURGUESAS } from '../../../../core/constants';
import {
  CustomDialog,
  CustomDialogData,
  CustomDialogResult,
} from '../../components/custom-dialog/custom-dialog';

@Component({
  selector: 'app-carta',
  imports: [MoneyPipe],
  templateUrl: './carta.html',
  styleUrl: './carta.scss',
})
export class Carta {
  private readonly menuService = inject(MenuService);
  private readonly ofertaService = inject(OfertaService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  readonly cart = inject(CartStore);

  readonly maxHamburguesas = MAX_HAMBURGUESAS;

  private readonly productos = toSignal(this.menuService.listar(), { initialValue: [] as Producto[] });

  readonly ofertas = toSignal(this.ofertaService.listarActivas(), { initialValue: [] as Oferta[] });
  readonly hamburguesas = computed(() => this.productos().filter((p) => p.tipo === 'HAMBURGUESA'));
  readonly extras = computed(() => this.productos().filter((p) => p.tipo === 'EXTRA'));

  cantidadEnPedido(producto: Producto): number {
    return this.cart
      .lines()
      .filter((l) => !l.esOferta && l.refId === producto.id)
      .reduce((a, l) => a + l.cantidad, 0);
  }

  abrirCustom(producto: Producto): void {
    const ref = this.dialog.open<CustomDialog, CustomDialogData, CustomDialogResult>(CustomDialog, {
      data: { producto, cupo: this.cart.cupoHamburguesas() },
      panelClass: 'sticky-dialog',
      maxWidth: '92vw',
    });
    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.cart.agregarHamburguesa(producto, res.cantidad, res.medallonExtra, res.nota);
      }
    });
  }

  agregarExtra(producto: Producto): void {
    this.cart.agregarExtra(producto);
  }

  cantidadOfertaEnPedido(oferta: Oferta): number {
    return this.cart
      .lines()
      .filter((l) => l.esOferta && l.refId === oferta.id)
      .reduce((a, l) => a + l.cantidad, 0);
  }

  agregarOferta(oferta: Oferta): void {
    this.cart.agregarOferta(oferta);
  }

  verPedido(): void {
    this.router.navigate(['/carrito']);
  }
}
