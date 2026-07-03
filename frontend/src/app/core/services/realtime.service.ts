import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pedido } from '../models/pedido.model';

/** Conexión STOMP a las notificaciones del backend. Se conecta al primer uso. */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private client: Client | null = null;
  private readonly pedidoNuevo$ = new Subject<Pedido>();
  private readonly estadoCambiado$ = new Subject<Pedido>();

  onPedidoNuevo(): Observable<Pedido> {
    this.ensureConnected();
    return this.pedidoNuevo$.asObservable();
  }

  onEstadoCambiado(): Observable<Pedido> {
    this.ensureConnected();
    return this.estadoCambiado$.asObservable();
  }

  disconnect(): void {
    void this.client?.deactivate();
    this.client = null;
  }

  private ensureConnected(): void {
    if (this.client) {
      return;
    }
    const client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl) as WebSocket,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/pedidos-nuevos', (m) => this.emit(this.pedidoNuevo$, m));
        client.subscribe('/topic/pedidos-estado', (m) => this.emit(this.estadoCambiado$, m));
      },
    });
    client.activate();
    this.client = client;
  }

  private emit(subject: Subject<Pedido>, message: IMessage): void {
    subject.next(JSON.parse(message.body) as Pedido);
  }
}
