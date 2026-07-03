import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CambiarEstadoRequest, CrearPedidoRequest, EstadoPedido, Pedido } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  /** Público: crea un pedido. */
  crear(request: CrearPedidoRequest): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.api}/api/pedidos`, request);
  }

  /** Admin: lista todos los pedidos. */
  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.api}/api/admin/pedidos`);
  }

  /** Admin: cambia el estado (si no se pasa, avanza al siguiente). */
  cambiarEstado(id: number, estado?: EstadoPedido): Observable<Pedido> {
    const body: CambiarEstadoRequest = { estado };
    return this.http.patch<Pedido>(`${this.api}/api/admin/pedidos/${id}/estado`, body);
  }
}
