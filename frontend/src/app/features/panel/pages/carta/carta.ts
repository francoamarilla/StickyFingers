import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MenuService } from '../../../../core/services/menu.service';
import { Producto, ProductoRequest, TipoProducto } from '../../../../core/models/menu.model';
import { MoneyPipe } from '../../../../shared/money.pipe';

// ponytail: mismos 4 renglones que ofertas.ts; se duplican en vez de crear un shared.
/** "18000" -> "$18.000" para mostrar en el input. */
function formatMoneda(n: number | null): string {
  return n ? '$' + n.toLocaleString('es-AR') : '';
}
/** Extrae el número de un texto con formato moneda ("$18.000" -> 18000). */
function parseMoneda(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '');
  return digitos ? Number(digitos) : null;
}

@Component({
  selector: 'app-carta',
  imports: [FormsModule, MoneyPipe],
  templateUrl: './carta.html',
  styleUrl: './carta.scss',
})
export class Carta {
  private readonly menuService = inject(MenuService);
  private readonly snack = inject(MatSnackBar);

  readonly productos = signal<Producto[]>([]);
  readonly editandoId = signal<number | null>(null);

  readonly tipo = signal<TipoProducto>('HAMBURGUESA');
  readonly nombre = signal('');
  readonly descripcion = signal('');
  readonly precio = signal<number | null>(null);
  readonly precioTexto = signal('');
  readonly disponible = signal(true);

  constructor() {
    this.cargar();
  }

  onPrecio(texto: string): void {
    const n = parseMoneda(texto);
    this.precio.set(n);
    this.precioTexto.set(formatMoneda(n));
  }

  private cargar(): void {
    this.menuService.listarTodos().subscribe((ps) => this.productos.set(ps));
  }

  editar(p: Producto): void {
    this.editandoId.set(p.id);
    this.tipo.set(p.tipo);
    this.nombre.set(p.nombre);
    this.descripcion.set(p.descripcion ?? '');
    this.precio.set(p.precio);
    this.precioTexto.set(formatMoneda(p.precio));
    this.disponible.set(p.disponible);
  }

  nuevo(): void {
    this.editandoId.set(null);
    this.tipo.set('HAMBURGUESA');
    this.nombre.set('');
    this.descripcion.set('');
    this.precio.set(null);
    this.precioTexto.set('');
    this.disponible.set(true);
  }

  guardar(): void {
    if (!this.nombre().trim() || !this.precio()) {
      this.snack.open('Completá nombre y precio', 'OK', { duration: 2500 });
      return;
    }
    const req: ProductoRequest = {
      tipo: this.tipo(),
      nombre: this.nombre().trim(),
      descripcion: this.descripcion().trim() || null,
      precio: this.precio()!,
      disponible: this.disponible(),
    };
    const id = this.editandoId();
    const obs = id ? this.menuService.actualizar(id, req) : this.menuService.crear(req);
    obs.subscribe({
      next: () => {
        this.snack.open(id ? 'Producto actualizado' : 'Producto creado', 'OK', { duration: 2000 });
        this.nuevo();
        this.cargar();
      },
      error: () => this.snack.open('No se pudo guardar', 'OK', { duration: 3000 }),
    });
  }

  eliminar(p: Producto): void {
    this.menuService.eliminar(p.id).subscribe({
      next: () => {
        if (this.editandoId() === p.id) {
          this.nuevo();
        }
        this.cargar();
      },
      error: () => this.snack.open('No se pudo eliminar', 'OK', { duration: 3000 }),
    });
  }
}
