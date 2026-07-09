import { useEffect, useState } from "react";
import {
  estaVozActivada,
  establecerVozActivada,
  suscribirVozActivada,
  hablarPrioridad,
} from "../services/speechService";

/**
 * Hook para leer y cambiar el estado global de "voz activada/desactivada"
 * desde cualquier pantalla, manteniéndolas todas sincronizadas entre sí.
 */
export function useVoiceEnabled() {
  const [activada, setActivada] = useState(estaVozActivada());

  useEffect(() => suscribirVozActivada(setActivada), []);

  const alternar = () => {
    const nuevoValor = !activada;
    // Avisa el nuevo estado ANTES de aplicarlo si se está activando,
    // para que el usuario confirme por voz que sí quedó prendida.
    if (nuevoValor) {
      establecerVozActivada(true);
      hablarPrioridad("Voz activada");
    } else {
      hablarPrioridad("Voz desactivada");
      setTimeout(() => establecerVozActivada(false), 900);
    }
  };

  return { activada, alternar };
}
