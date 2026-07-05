import * as Speech from "expo-speech";

const IDIOMA = "es-EC";

/**
 * Para alertas de seguridad (obstáculos cercanos detectados por la cámara).
 * Interrumpe cualquier otra cosa que se esté diciendo — un obstáculo
 * siempre tiene prioridad sobre una instrucción de ruta.
 */
export function hablarPrioridad(texto: string) {
  Speech.stop();
  Speech.speak(texto, { language: IDIOMA });
}

/**
 * Para avisos de navegación rutinarios (instrucciones de ruta, distancia).
 * Se encola detrás de lo que se esté hablando, no lo interrumpe.
 */
export function hablarEnCola(texto: string) {
  Speech.speak(texto, { language: IDIOMA });
}

export function detenerVoz() {
  Speech.stop();
}
