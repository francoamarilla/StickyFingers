export type TipoProducto = 'HAMBURGUESA' | 'EXTRA';

export interface Producto {
  id: number;
  tipo: TipoProducto;
  nombre: string;
  descripcion: string | null;
  precio: number;
  disponible: boolean;
}

export interface ProductoRequest {
  tipo: TipoProducto;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  disponible: boolean;
}
