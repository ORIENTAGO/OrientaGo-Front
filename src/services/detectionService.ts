import { BACKEND_URL } from "../config/env";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export type Detection = {
  label: string;
  confidence: number;
  distancia_aprox_m: number;
  bbox: [number, number, number, number];
  en_trayectoria: boolean;
};

type DetectionResponse = {
  detections: Detection[];
  inference_ms: number;
};

/** Tamaño al que YOLOv8n espera la imagen (ancho en px). */
const TARGET_WIDTH = 640;

/**
 * Redimensiona la imagen capturada a 640px de ancho en el dispositivo,
 * la comprime como JPEG de baja calidad y la envía al backend.
 * Esto reduce el payload de ~2 MB a ~15-30 KB, ahorrando datos y batería.
 */
export async function detectFrame(photoUri: string): Promise<Detection[]> {
  // --- Redimensionar en el dispositivo antes de enviar ---
  const resized = await manipulateAsync(
    photoUri,
    [{ resize: { width: TARGET_WIDTH } }],
    { compress: 0.5, format: SaveFormat.JPEG }
  );

  const formData = new FormData();
  // @ts-expect-error - React Native FormData acepta este shape para archivos
  formData.append("frame", {
    uri: resized.uri,
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
