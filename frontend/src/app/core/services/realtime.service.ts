import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { PedidoEvento } from '../models/pedido.model';

/**
 * Conexión STOMP a las notificaciones del panel. Se conecta al primer uso.
 * El JWT viaja en el frame CONNECT (no en la URL). Un rechazo del servidor (frame ERROR:
 * token inválido, vencido o sin rol) cierra la sesión del panel y NO reintenta. Solo se
 * reintenta ante caídas de red.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private client: Client | null = null;
  private readonly pedidoNuevo$ = new Subject<PedidoEvento>();
  private readonly estadoCambiado$ = new Subject<PedidoEvento>();
  private readonly reconectado$ = new Subject<void>();

  constructor() {
    // Cualquier logout (manual o por un 401 en REST) corta la conexión.
    effect(() => {
      if (!this.auth.token()) {
        this.disconnect();
      }
    });
  }

  onPedidoNuevo(): Observable<PedidoEvento> {
    this.ensureConnected();
    return this.pedidoNuevo$.asObservable();
  }

  onEstadoCambiado(): Observable<PedidoEvento> {
    this.ensureConnected();
    return this.estadoCambiado$.asObservable();
  }

  /** Emite al recuperar la conexión, para resincronizar por REST lo perdido mientras estuvo caída. */
  onReconectado(): Observable<void> {
    this.ensureConnected();
    return this.reconectado$.asObservable();
  }

  disconnect(): void {
    void this.client?.deactivate();
    this.client = null;
  }

  private ensureConnected(): void {
    if (this.client || !this.auth.token()) {
      return;
    }
    let conexiones = 0;
    const client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl) as WebSocket,
      reconnectDelay: 5000,
      // Se evalúa antes de cada (re)conexión: siempre con el token vigente.
      beforeConnect: () => {
        const token = this.auth.token();
        if (!token || tokenVencido(token)) {
          this.cerrarSesion();
          return;
        }
        client.connectHeaders = { Authorization: `Bearer ${token}` };
      },
      onConnect: () => {
        client.subscribe('/topic/pedidos-nuevos', (m) => this.emit(this.pedidoNuevo$, m));
        client.subscribe('/topic/pedidos-estado', (m) => this.emit(this.estadoCambiado$, m));
        if (conexiones++ > 0) {
          this.reconectado$.next();
        }
      },
      onStompError: () => this.cerrarSesion(),
    });
    client.activate();
    this.client = client;
  }

  /** Rechazo de autenticación: desactiva el cliente (sin reintentos) y vuelve al login. */
  private cerrarSesion(): void {
    this.disconnect();
    if (this.auth.isAuthenticated()) {
      this.auth.logout();
      void this.router.navigate(['/panel/login']);
    }
  }

  private emit(subject: Subject<PedidoEvento>, message: IMessage): void {
    subject.next(JSON.parse(message.body) as PedidoEvento);
  }
}

/** Lee el `exp` del JWT para no intentar conectar con un token que ya sabemos vencido. */
function tokenVencido(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
