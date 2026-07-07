import * as Speech from "expo-speech";
import * as SecureStore from "expo-secure-store";

const IDIOMA = "es-EC";
const CLAVE_PREFERENCIA = "orientago_voz_activada";

let vozActivada = true;
const listeners = new Set<(v: boolean) => void>();

export function estaVozActivada(): boolean {
  return vozActivada;
}

export function establecerVozActivada(valor: boolean) {
  vozActivada = valor;
  listeners.forEach((fn) => fn(valor));
  SecureStore.setItemAsync(CLAVE_PREFERENCIA, valor ? "1" : "0").catch(() => {});
  if (!valor) Speech.stop();
}

export function suscribirVozActivada(fn: (v: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Se llama una vez al iniciar la app para recuperar la preferencia guardada. */
export async function cargarPreferenciaDeVoz() {
  try {
    const valor = await SecureStore.getItemAsync(CLAVE_PREFERENCIA);
    if (valor !== null) {
      vozActivada = valor === "1";
      listeners.forEach((fn) => fn(vozActivada));
    }
  } catch {
    // Si falla la lectura, se queda con el valor por defecto (activada)
  }
}

/**
 * Para alertas de seguridad (obstáculos cercanos detectados por la cámara).
 * Interrumpe cualquier otra cosa que se esté diciendo — un obstáculo
 * siempre tiene prioridad sobre una instrucción de ruta.
 */
export function hablarPrioridad(texto: string) {
  if (!vozActivada) return;
  Speech.stop();
  Speech.speak(texto, { language: IDIOMA });
}

/**
 * Para avisos de navegación rutinarios (instrucciones de ruta, distancia).
 * Se encola detrás de lo que se esté hablando, no lo interrumpe.
 */
export function hablarEnCola(texto: string) {
  if (!vozActivada) return;
  Speech.speak(texto, { language: IDIOMA });
}

export function detenerVoz() {
  Speech.stop();
}
