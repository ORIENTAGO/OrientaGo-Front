import { BACKEND_URL } from "../config/env";

export type Detection = {
  label: string;
  confidence: number;
  distancia_aprox_m: number;
  bbox: [number, number, number, number];
};

type DetectionResponse = {
  detections: Detection[];
  inference_ms: number;
};

/**
 * Envía una foto (uri local del celular) al servidor de detección
 * y devuelve la lista de objetos detectados.
 */
export async function detectFrame(photoUri: string): Promise<Detection[]> {
  const formData = new FormData();
  // @ts-expect-error - React Native FormData acepta este shape para archivos
  formData.append("frame", {
    uri: photoUri,
    name: "frame.jpg",
    type: "image/jpeg",
  });

  const response = await fetch(`${BACKEND_URL}/detect`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.status}`);
  }

  const data: DetectionResponse = await response.json();
  return data.detections;
}
