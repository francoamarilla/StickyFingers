import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OfertaService } from '../../../../core/services/oferta.service';
import { Oferta, OfertaRequest } from '../../../../core/models/oferta.model';
import { MoneyPipe } from '../../../../shared/money.pipe';
import { descargarImagenOferta } from './oferta-imagen.util';

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
  selector: 'app-ofertas',
  imports: [FormsModule, MoneyPipe],
  templateUrl: './ofertas.html',
  styleUrl: './ofertas.scss',
})
export class Ofertas {
  private readonly ofertaService = inject(OfertaService);
  private readonly snack = inject(MatSnackBar);

  readonly ofertas = signal<Oferta[]>([]);
  readonly editandoId = signal<number | null>(null);

  readonly titulo = signal('');
  readonly descripcion = signal('');
  readonly precio = signal<number | null>(null);
  readonly precioTexto = signal('');
  readonly vigencia = signal('Solo hoy');
  readonly activa = signal(true);

  onPrecio(texto: string): void {
    const n = parseMoneda(texto);
    this.precio.set(n);
    this.precioTexto.set(formatMoneda(n));
  }

  descargarImagen(o: Oferta): void {
    descargarImagenOferta(o).catch(() =>
      this.snack.open('No se pudo generar la imagen', 'OK', { duration: 3000 }),
    );
  }

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.ofertaService.listarTodas().subscribe((os) => this.ofertas.set(os));
  }

  editar(o: Oferta): void {
    this.editandoId.set(o.id);
    this.titulo.set(o.titulo);
    this.descripcion.set(o.descripcion ?? '');
    this.precio.set(o.precio);
    this.precioTexto.set(formatMoneda(o.precio));
    this.vigencia.set(o.vigencia ?? '');
    this.activa.set(o.activa);
  }

  nueva(): void {
    this.editandoId.set(null);
    this.titulo.set('');
    this.descripcion.set('');
    this.precio.set(null);
    this.precioTexto.set('');
    this.vigencia.set('Solo hoy');
    this.activa.set(true);
  }

  guardar(): void {
    if (!this.titulo().trim() || !this.precio()) {
      this.snack.open('Completá título y precio', 'OK', { duration: 2500 });
      return;
    }
    const req: OfertaRequest = {
      titulo: this.titulo().trim(),
      descripcion: this.descripcion().trim() || null,
      precio: this.precio()!,
      vigencia: this.vigencia().trim() || null,
      activa: this.activa(),
    };
    const id = this.editandoId();
    const obs = id ? this.ofertaService.actualizar(id, req) : this.ofertaService.crear(req);
    obs.subscribe({
      next: () => {
        this.snack.open(id ? 'Oferta actualizada' : 'Oferta creada', 'OK', { duration: 2000 });
        this.nueva();
        this.cargar();
      },
      error: () => this.snack.open('No se pudo guardar', 'OK', { duration: 3000 }),
    });
  }

  eliminar(o: Oferta): void {
    this.ofertaService.eliminar(o.id).subscribe({
      next: () => {
        if (this.editandoId() === o.id) {
          this.nueva();
        }
        this.cargar();
      },
      error: () => this.snack.open('No se pudo eliminar', 'OK', { duration: 3000 }),
    });
  }
}
