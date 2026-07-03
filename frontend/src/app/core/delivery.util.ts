import { RADIO_MAX_KM } from './constants';

/** Ubicación del local (Buenos Aires 1058, Córdoba Capital). Coincide con sticky.delivery.origen-* del backend. */
export const ORIGEN = { lat: -31.4265, lng: -64.1888 } as const;

const RADIO_TIERRA_KM = 6371;

export interface Coordenadas {
  lat: number;
  lng: number;
}

/** Distancia en km entre el local y unas coordenadas (fórmula de Haversine). Preview: el backend es la fuente de verdad. */
export function haversineKm(lat: number, lng: number): number {
  const toRad = (g: number) => (g * Math.PI) / 180;
  const dLat = toRad(lat - ORIGEN.lat);
  const dLng = toRad(lng - ORIGEN.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(ORIGEN.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(RADIO_TIERRA_KM * c * 100) / 100;
}

/**
 * Geocodifica una dirección de Córdoba a coordenadas usando Nominatim (OpenStreetMap).
 * Usa fetch nativo (no HttpClient) para no adjuntar el JWT del interceptor a un host externo.
 * Devuelve null si no encuentra la dirección.
 */
export async function geocodificar(direccion: string): Promise<Coordenadas | null> {
  const q = direccion.trim();
  if (!q) {
    return null;
  }
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'ar',
    city: 'Córdoba',
    street: q,
  });
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) {
      return null;
    }
    const data = (await resp.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) {
      return null;
    }
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
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
