import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductoRequest } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/menu`;
  private readonly adminUrl = `${environment.apiBaseUrl}/api/admin/productos`;

  /** Público: solo productos disponibles. */
  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.baseUrl);
  }

  /** Admin: todos los productos (incluye no disponibles). */
  listarTodos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.adminUrl);
  }

  crear(request: ProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(this.adminUrl, request);
  }

  actualizar(id: number, request: ProductoRequest): Observable<Producto> {
    return this.http.put<Producto>(`${this.adminUrl}/${id}`, request);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}
