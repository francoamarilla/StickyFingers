import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Informe, RangoInforme } from '../models/informe.model';

@Injectable({ providedIn: 'root' })
export class InformeService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  generar(rango: RangoInforme): Observable<Informe> {
    const params = new HttpParams().set('rango', rango);
    return this.http.get<Informe>(`${this.api}/api/admin/informes`, { params });
  }
}
