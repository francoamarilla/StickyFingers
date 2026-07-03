import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Producto } from '../../../../core/models/menu.model';
import { MEDALLON_PRECIO } from '../../../../core/constants';
import { MoneyPipe } from '../../../../shared/money.pipe';

export interface CustomDialogData {
  producto: Producto;
  cupo: number;
}

export interface CustomDialogResult {
  cantidad: number;
  medallonExtra: boolean;
  nota: string;
}

@Component({
  selector: 'app-custom-dialog',
  imports: [FormsModule, MoneyPipe],
  templateUrl: './custom-dialog.html',
  styleUrl: './custom-dialog.scss',
})
export class CustomDialog {
  private readonly ref = inject<MatDialogRef<CustomDialog, CustomDialogResult>>(MatDialogRef);
  readonly data = inject<CustomDialogData>(MAT_DIALOG_DATA);

  readonly medallonPrecio = MEDALLON_PRECIO;
  readonly cantidad = signal(1);
  readonly medallonExtra = signal(false);
  readonly nota = signal('');

  readonly maximo = computed(() => Math.max(1, this.data.cupo));
  readonly enMaximo = computed(() => this.cantidad() >= this.maximo());

  readonly precioLinea = computed(() => {
    const unit = this.data.producto.precio + (this.medallonExtra() ? MEDALLON_PRECIO : 0);
    return unit * this.cantidad();
  });

  incrementar(): void {
    if (this.cantidad() < this.maximo()) {
      this.cantidad.update((c) => c + 1);
    }
  }

  decrementar(): void {
    if (this.cantidad() > 1) {
      this.cantidad.update((c) => c - 1);
    }
  }

  toggleMedallon(): void {
    this.medallonExtra.update((v) => !v);
  }

  cancelar(): void {
    this.ref.close();
  }

  agregar(): void {
    this.ref.close({
      cantidad: this.cantidad(),
      medallonExtra: this.medallonExtra(),
      nota: this.nota(),
    });
  }
}
