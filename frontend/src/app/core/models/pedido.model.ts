export type TipoEntrega = 'RETIRO' | 'DELIVERY';
export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA';
export type TipoLinea = 'BURGER' | 'EXTRA';
export type EstadoPedido = 'NUEVO' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO';

export interface ItemPedido {
  id: number;
  productoId: number | null;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  medallonExtra: boolean;
  nota: string | null;
  tipoLinea: TipoLinea;
  subtotalLinea: number;
}

export interface Pedido {
  id: number;
  numero: string;
  fecha: string;
  clienteNombre: string;
  clienteTelefono: string;
  tipoEntrega: TipoEntrega;
  direccion: string | null;
  km: number | null;
  lluvia: boolean;
  subtotal: number;
  costoEnvio: number;
  total: number;
  medioPago: MedioPago;
  notaGeneral: string | null;
  estado: EstadoPedido;
  items: ItemPedido[];
}

export interface ItemPedidoRequest {
  productoId: number;
  cantidad: number;
  medallonExtra: boolean;
  nota?: string | null;
}

export interface CrearPedidoRequest {
  clienteNombre: string;
  clienteTelefono: string;
  tipoEntrega: TipoEntrega;
  direccion?: string | null;
  km?: number | null;
  lluvia: boolean;
  medioPago: MedioPago;
  notaGeneral?: string | null;
  items: ItemPedidoRequest[];
}

export interface CambiarEstadoRequest {
  estado?: EstadoPedido;
}
