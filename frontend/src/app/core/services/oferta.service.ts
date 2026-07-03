import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Oferta, OfertaRequest } from '../models/oferta.model';

@Injectable({ providedIn: 'root' })
export class OfertaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  /** Público: ofertas activas. */
  listarActivas(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${this.api}/api/ofertas`);
  }

  /** Admin: todas las ofertas. */
  listarTodas(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${this.api}/api/admin/ofertas`);
  }

  crear(request: OfertaRequest): Observable<Oferta> {
    return this.http.post<Oferta>(`${this.api}/api/admin/ofertas`, request);
  }

  actualizar(id: number, request: OfertaRequest): Observable<Oferta> {
    return this.http.put<Oferta>(`${this.api}/api/admin/ofertas/${id}`, request);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/api/admin/ofertas/${id}`);
  }
}
