export interface Detection {
  label: string;
  confidence: number;
  distancia_aprox_m: number;
  bbox: [number, number, number, number];
}
