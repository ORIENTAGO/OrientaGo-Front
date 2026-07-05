import * as Location from "expo-location";
import type { Coordenada, EstadoUbicacion } from "../types/geo";

/**
 * Pide permiso de ubicación en primer plano.
 * Devuelve un estado legible para la UI en vez de un booleano crudo,
 * para poder distinguir "denegado" de "GPS apagado" en los mensajes.
 */
export async function solicitarPermisoUbicacion(): Promise<EstadoUbicacion> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return "denegado";

    const gpsActivo = await Location.hasServicesEnabledAsync();
    if (!gpsActivo) return "gps_desactivado";

    return "concedido";
  } catch {
    return "error";
  }
}

export async function obtenerUbicacionActual(): Promise<Coordenada | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitud: pos.coords.latitude, longitud: pos.coords.longitude };
  } catch {
    return null;
  }
}

export type ActualizacionUbicacion = {
  coordenada: Coordenada;
  precisionMetros: number;
};

/**
 * Suscribe a cambios de posición. Se actualiza solo cuando el usuario se
 * mueve una distancia mínima (distanceInterval), no en un intervalo fijo,
 * para ahorrar batería y datos.
 */
export async function seguirUbicacion(
  onUpdate: (u: ActualizacionUbicacion) => void
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 4000,
      distanceInterval: 8, // metros
    },
    (pos) => {
      onUpdate({
        coordenada: { latitud: pos.coords.latitude, longitud: pos.coords.longitude },
        precisionMetros: pos.coords.accuracy ?? 20,
      });
    }
  );
}

export async function seguirBrujula(
  onUpdate: (gradosNorte: number) => void
): Promise<Location.LocationSubscription> {
  return Location.watchHeadingAsync((h) => {
    const grados = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
    onUpdate(grados);
  });
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitud - a.latitud);
  const dLon = toRad(b.longitud - a.longitud);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitud)) * Math.cos(toRad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
