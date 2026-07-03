export interface Oferta {
  id: number;
  titulo: string;
  descripcion: string | null;
  precio: number;
  vigencia: string | null;
  activa: boolean;
}

export interface OfertaRequest {
  titulo: string;
  descripcion?: string | null;
  precio: number;
  vigencia?: string | null;
  activa: boolean;
}
