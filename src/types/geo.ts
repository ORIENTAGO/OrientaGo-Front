export type Coordenada = { latitud: number; longitud: number };

export type LugarBuscado = {
  id: string;
  nombreCorto: string;
  direccionCompleta: string;
  coordenada: Coordenada;
};

export type ModoTransporte = "auto" | "caminando" | "bicicleta";

export type RutaCalculada = {
  distanciaMetros: number;
  duracionSegundos: number;
  puntos: Coordenada[]; // geometría de la ruta para dibujar la polilínea
  esEstimado: boolean; // true si no vino de un routing real (fallback en línea recta)
};

export type EstadoUbicacion =
  | "cargando"
  | "concedido"
  | "denegado"
  | "gps_desactivado"
  | "error";
