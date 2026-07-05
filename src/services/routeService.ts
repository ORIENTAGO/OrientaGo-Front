import type { Coordenada, LugarBuscado, ModoTransporte, RutaCalculada } from "../types/geo";
import { distanciaMetros } from "./locationService";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OSRM_URL = "https://router.project-osrm.org";
// Nominatim pide un User-Agent identificable para uso aceptable de su API pública.
const HEADERS = { "User-Agent": "OrientaGo-App/1.0 (proyecto universitario UCE)" };

// Velocidades promedio para estimar tiempo cuando el modo no es "auto"
// (el servidor público de ruteo solo calcula geometría vehicular confiable).
const VELOCIDAD_KMH: Record<ModoTransporte, number> = {
  auto: 0, // se usa la duración real que devuelve OSRM
  caminando: 4.5,
  bicicleta: 15,
};

export class SinConexionError extends Error {
  constructor() {
    super("Sin conexión a internet o el servicio de mapas no respondió.");
  }
}

export class DestinoInvalidoError extends Error {
  constructor() {
    super("No se encontró ese lugar. Intenta ser más específico.");
  }
}

/** Autocompletado de direcciones/lugares mientras el usuario escribe. */
export async function buscarLugares(
  consulta: string,
  cercaDe?: Coordenada
): Promise<LugarBuscado[]> {
  if (!consulta.trim()) return [];
  const params = new URLSearchParams({
    q: consulta,
    format: "json",
    addressdetails: "1",
    limit: "5",
    "accept-language": "es",
  });
  if (cercaDe) {
    // Sesga resultados hacia la zona actual del usuario (viewbox amplio, no exclusivo)
    const delta = 0.6;
    params.set(
      "viewbox",
      `${cercaDe.longitud - delta},${cercaDe.latitud + delta},${cercaDe.longitud + delta},${cercaDe.latitud - delta}`
    );
  }

  let response: Response;
  try {
    response = await fetch(`${NOMINATIM_URL}/search?${params.toString()}`, { headers: HEADERS });
  } catch {
    throw new SinConexionError();
  }
  if (!response.ok) throw new SinConexionError();

  const data = await response.json();
  return (data as any[]).map((item) => ({
    id: String(item.place_id),
    nombreCorto: item.display_name.split(",")[0],
    direccionCompleta: item.display_name,
    coordenada: { latitud: parseFloat(item.lat), longitud: parseFloat(item.lon) },
  }));
}

/** Geocodifica una búsqueda puntual (cuando el usuario dicta/escribe y da "Enter" directo). */
export async function buscarUnLugar(consulta: string): Promise<LugarBuscado> {
  const resultados = await buscarLugares(consulta);
  if (resultados.length === 0) throw new DestinoInvalidoError();
  return resultados[0];
}

/**
 * Calcula la ruta entre dos puntos. Usa OSRM (routing real sobre calles) para
 * la geometría; si el servicio no responde, cae a una línea recta estimada
 * para que la app nunca se quede sin guía (marcado con `esEstimado: true`).
 */
export async function calcularRuta(
  origen: Coordenada,
  destino: Coordenada,
  modo: ModoTransporte
): Promise<RutaCalculada> {
  const url = `${OSRM_URL}/route/v1/driving/${origen.longitud},${origen.latitud};${destino.longitud},${destino.latitud}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("OSRM respondió con error");
    const data = await response.json();
    const ruta = data?.routes?.[0];
    if (!ruta) throw new Error("Sin rutas");

    const puntos: Coordenada[] = ruta.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => ({ latitud: lat, longitud: lon })
    );
    const distanciaM = ruta.distance as number;
    const duracionS =
      modo === "auto" ? (ruta.duration as number) : (distanciaM / 1000 / VELOCIDAD_KMH[modo]) * 3600;

    return { distanciaMetros: distanciaM, duracionSegundos: duracionS, puntos, esEstimado: false };
  } catch {
    // Fallback: línea recta + velocidad promedio del modo elegido
    const distanciaM = distanciaMetros(origen, destino);
    const velocidad = modo === "auto" ? 35 : VELOCIDAD_KMH[modo];
    const duracionS = (distanciaM / 1000 / velocidad) * 3600;
    return {
      distanciaMetros: distanciaM,
      duracionSegundos: duracionS,
      puntos: [origen, destino],
      esEstimado: true,
    };
  }
}
