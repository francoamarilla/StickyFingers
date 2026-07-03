import { Injectable, signal } from '@angular/core';
import { Pedido } from '../../core/models/pedido.model';

/** Guarda el último pedido confirmado para mostrarlo en la pantalla de confirmación. */
@Injectable({ providedIn: 'root' })
export class LastOrderStore {
  readonly pedido = signal<Pedido | null>(null);
}
