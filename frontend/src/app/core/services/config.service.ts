import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Configuración global del local expuesta por la API. */
export interface ConfiguracionGlobal {
  lluvia: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  /** Público: configuración global (p. ej. si está lloviendo). */
  obtener(): Observable<ConfiguracionGlobal> {
    return this.http.get<ConfiguracionGlobal>(`${this.api}/api/config`);
  }

  /** Admin: activar/desactivar el flag de lluvia. */
  setLluvia(lluvia: boolean): Observable<ConfiguracionGlobal> {
    return this.http.patch<ConfiguracionGlobal>(`${this.api}/api/admin/config`, { lluvia });
  }
}
