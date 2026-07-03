import { RADIO_MAX_KM } from './constants';

interface Zona {
  claves: string[];
  km: number;
}

const ZONAS: Zona[] = [
  { claves: ['nueva cordoba', 'nva cordoba', 'n cordoba'], km: 1.5 },
  { claves: ['centro'], km: 2 },
  { claves: ['guemes'], km: 2.5 },
  { claves: ['observatorio'], km: 3 },
  { claves: ['alberdi', 'general paz', 'gral paz', 'san vicente'], km: 3.5 },
];

/** Estima los km a partir del texto de la dirección (igual que el prototipo). Preview: el backend es la fuente de verdad. */
export function estimarKm(direccion: string): number {
  const s = (direccion || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const zona of ZONAS) {
    if (zona.claves.some((c) => s.includes(c))) {
      return zona.km;
    }
  }
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  const opciones = [1, 1.5, 2, 2.5, 3, 3.5];
  return opciones[h % opciones.length];
}

/** Costo de envío estimado (preview). Devuelve null si está fuera de radio. */
export function estimarCostoEnvio(km: number, lluvia: boolean): number | null {
  if (km > RADIO_MAX_KM) {
    return null;
  }
  if (km <= 2) {
    return lluvia ? 3000 : 2500;
  }
  if (km <= 2.5) {
    return lluvia ? 3500 : 3000;
  }
  return lluvia ? 4000 : 3500;
}
