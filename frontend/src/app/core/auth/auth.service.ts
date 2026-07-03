import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, TokenResponse } from '../models/auth.model';

const STORAGE_KEY = 'sticky_admin_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  private readonly _token = signal<string | null>(this.readToken());
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  login(request: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.api}/api/auth/login`, request).pipe(
      tap((res) => this.setToken(res.token)),
    );
  }

  logout(): void {
    this._token.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private setToken(token: string): void {
    this._token.set(token);
    localStorage.setItem(STORAGE_KEY, token);
  }

  private readToken(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }
}
