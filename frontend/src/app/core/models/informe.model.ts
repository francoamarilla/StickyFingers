export type RangoInforme = 'DIA' | 'SEMANA' | 'MES';

export interface ProductoRanking {
  nombre: string;
  cantidad: number;
}

export interface Informe {
  rango: string;
  desde: string;
  hasta: string;
  cantidadPedidos: number;
  totalVentas: number;
  ranking: ProductoRanking[];
}
