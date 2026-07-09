import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import * as Location from "expo-location";
import type { Coordenada, LugarBuscado, ModoTransporte, RutaCalculada } from "../types/geo";
import {
  solicitarPermisoUbicacion,
  obtenerUbicacionActual,
  seguirUbicacion,
  seguirBrujula,
} from "../services/locationService";
import { calcularRuta, SinConexionError } from "../services/routeService";
import { hablarEnCola, detenerVoz } from "../services/speechService";

const UMBRAL_RECALCULO_M = 40;

function calcularRumbo(origen: Coordenada, destino: Coordenada): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const toDeg = (v: number) => (v * 180) / Math.PI;
  const dLon = toRad(destino.longitud - origen.longitud);
  const y = Math.sin(dLon) * Math.cos(toRad(destino.latitud));
  const x =
    Math.cos(toRad(origen.latitud)) * Math.sin(toRad(destino.latitud)) -
    Math.sin(toRad(origen.latitud)) * Math.cos(toRad(destino.latitud)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Decide la instrucción de giro con "histéresis": para SALIR de "sigue
 * recto" hace falta un desvío más marcado que para volver a él. Esto
 * evita que, con la brújula temblando unos grados, la instrucción esté
 * saltando entre "gira a la derecha" / "gira a la izquierda" / "sigue
 * recto" todo el tiempo — solo cambia cuando el giro es real y sostenido.
 */
function calcularInstruccionEstable(
  rumboDestino: number,
  direccionActual: number,
  instruccionPrevia: string
): string {
  const diff = ((rumboDestino - direccionActual + 540) % 360) - 180; // -180..180
  const abs = Math.abs(diff);

  const UMBRAL_ENTRAR_RECTO = 18; // para volver a "sigue recto"
  const UMBRAL_SALIR_RECTO = 30; // para dejar de ir recto

  if (abs > 160) return "Da la vuelta, vas en dirección contraria.";

  if (instruccionPrevia === "Sigue recto.") {
    if (abs <= UMBRAL_SALIR_RECTO) return "Sigue recto.";
  } else {
    if (abs <= UMBRAL_ENTRAR_RECTO) return "Sigue recto.";
  }
  return diff > 0 ? "Gira a la derecha." : "Gira a la izquierda.";
}

/** Promedio circular de varias lecturas de brújula, para suavizar el ruido. */
function suavizarDireccion(lecturas: number[]): number {
  const sumaSin = lecturas.reduce((s, a) => s + Math.sin((a * Math.PI) / 180), 0);
  const sumaCos = lecturas.reduce((s, a) => s + Math.cos((a * Math.PI) / 180), 0);
  return ((Math.atan2(sumaSin, sumaCos) * 180) / Math.PI + 360) % 360;
}

function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitud - a.latitud);
  const dLon = toRad(b.longitud - a.longitud);
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitud)) * Math.cos(toRad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatearDistancia(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function formatearDuracion(s: number): string {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  return `${horas} h ${min % 60} min`;
}

type EstadoNavegacion = {
  userLocation: Coordenada | null;
  accuracy: number;
  destino: LugarBuscado | null;
  ruta: RutaCalculada | null;
  calculandoRuta: boolean;
  siguiendo: boolean;
  instruccionActual: string;
  distanciaRestante: number | null;
  errorMsg: string | null;
  modo: ModoTransporte;
  establecerDestino: (lugar: LugarBuscado, modo: ModoTransporte) => Promise<void>;
  cambiarModo: (modo: ModoTransporte) => void;
  limpiarDestino: () => void;
  iniciarGuia: () => void;
  detenerGuia: () => void;
};

const NavigationGuideContext = createContext<EstadoNavegacion | null>(null);

export function NavigationGuideProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<Coordenada | null>(null);
  const [accuracy, setAccuracy] = useState(20);
  const [destino, setDestino] = useState<LugarBuscado | null>(null);
  const [ruta, setRuta] = useState<RutaCalculada | null>(null);
  const [calculandoRuta, setCalculandoRuta] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [instruccionActual, setInstruccionActual] = useState("");
  const [distanciaRestante, setDistanciaRestante] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoTransporte>("auto");

  const watchPosRef = useRef<Location.LocationSubscription | null>(null);
  const watchHeadingRef = useRef<Location.LocationSubscription | null>(null);
  const evaluarGuiaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferBrujulaRef = useRef<number[]>([]);
  const origenRutaRef = useRef<Coordenada | null>(null);
  const destinoRef = useRef<LugarBuscado | null>(null);
  const modoRef = useRef<ModoTransporte>("auto");
  const siguiendoRef = useRef(false);
  const ultimaInstruccionRef = useRef("");
  const ultimoAnuncioRef = useRef(0);
  const ultimoRecordatorioRef = useRef(0);

  useEffect(() => {
    destinoRef.current = destino;
  }, [destino]);
  useEffect(() => {
    modoRef.current = modo;
  }, [modo]);
  useEffect(() => {
    siguiendoRef.current = siguiendo;
  }, [siguiendo]);

  const recalcularRuta = useCallback(async (origen: Coordenada, dest: Coordenada, modoActual: ModoTransporte) => {
    setCalculandoRuta(true);
    setErrorMsg(null);
    try {
      const resultado = await calcularRuta(origen, dest, modoActual);
      setRuta(resultado);
      origenRutaRef.current = origen;
    } catch (err) {
      setErrorMsg(err instanceof SinConexionError ? err.message : "No se pudo calcular la ruta.");
    } finally {
      setCalculandoRuta(false);
    }
  }, []);

  function detenerGuiaInterna() {
    watchHeadingRef.current?.remove();
    watchHeadingRef.current = null;
    if (evaluarGuiaIntervalRef.current) {
      clearInterval(evaluarGuiaIntervalRef.current);
      evaluarGuiaIntervalRef.current = null;
    }
    bufferBrujulaRef.current = [];
    setSiguiendo(false);
    detenerVoz();
  }

  // Se activa una sola vez para toda la app: permisos + posición inicial +
  // seguimiento continuo. Al vivir en el Provider (por encima de las
  // pestañas), esto NUNCA se desmonta mientras la app esté abierta, así
  // que la guía sigue funcionando aunque el usuario cambie de pestaña.
  useEffect(() => {
    let activo = true;
    (async () => {
      const estado = await solicitarPermisoUbicacion();
      if (estado === "denegado") {
        setErrorMsg("Permiso de ubicación denegado. Actívalo en Ajustes.");
        return;
      }
      if (estado === "gps_desactivado") {
        setErrorMsg("El GPS está desactivado.");
        return;
      }
      if (estado === "error") {
        setErrorMsg("No se pudo acceder a la ubicación.");
        return;
      }

      const actual = await obtenerUbicacionActual();
      if (actual && activo) setUserLocation(actual);

      watchPosRef.current = await seguirUbicacion(({ coordenada, precisionMetros }) => {
        if (!activo) return;
        setUserLocation(coordenada);
        setAccuracy(precisionMetros);

        if (destinoRef.current) {
          const restante = distanciaMetros(coordenada, destinoRef.current.coordenada);
          setDistanciaRestante(restante);

          if (origenRutaRef.current) {
            const desplazamiento = distanciaMetros(origenRutaRef.current, coordenada);
            if (desplazamiento > UMBRAL_RECALCULO_M) {
              recalcularRuta(coordenada, destinoRef.current.coordenada, modoRef.current);
            }
          }

          if (siguiendoRef.current && restante < 15) {
            hablarEnCola("Has llegado a tu destino.");
            detenerGuiaInterna();
          }
        }
      });
    })();

    return () => {
      activo = false;
      watchPosRef.current?.remove();
      watchHeadingRef.current?.remove();
      if (evaluarGuiaIntervalRef.current) clearInterval(evaluarGuiaIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detenerGuia = useCallback(() => {
    detenerGuiaInterna();
    detenerVoz();
  }, []);

  const iniciarGuia = useCallback(() => {
    if (!destino || !ruta) return;
    setSiguiendo(true);
    ultimaInstruccionRef.current = "";
    ultimoRecordatorioRef.current = Date.now();
    hablarEnCola(
      `Iniciando guía hacia ${destino.nombreCorto}. ${formatearDistancia(ruta.distanciaMetros)}, ${formatearDuracion(ruta.duracionSegundos)}.`
    );

    const EVALUAR_CADA_MS = 5000; // pausa entre evaluaciones: nada de reaccionar a cada temblor
    const RECORDATORIO_CADA_MS = 20000; // reafirma la dirección aunque no haya cambiado

    (async () => {
      watchHeadingRef.current = await seguirBrujula((gradosNorte) => {
        // Solo acumula lecturas; no decide ni habla nada aquí todavía.
        const buffer = bufferBrujulaRef.current;
        buffer.push(gradosNorte);
        if (buffer.length > 8) buffer.shift();
      });

      evaluarGuiaIntervalRef.current = setInterval(() => {
        if (!userLocation || !destinoRef.current || bufferBrujulaRef.current.length === 0) return;

        const direccionSuavizada = suavizarDireccion(bufferBrujulaRef.current);
        const rumbo = calcularRumbo(userLocation, destinoRef.current.coordenada);
        const nuevaInstruccion = calcularInstruccionEstable(
          rumbo,
          direccionSuavizada,
          ultimaInstruccionRef.current
        );

        const ahora = Date.now();
        const cambioReal = nuevaInstruccion !== ultimaInstruccionRef.current;
        const tocaRecordatorio = ahora - ultimoRecordatorioRef.current > RECORDATORIO_CADA_MS;

        if (cambioReal) {
          setInstruccionActual(nuevaInstruccion);
          hablarEnCola(nuevaInstruccion);
          ultimaInstruccionRef.current = nuevaInstruccion;
          ultimoAnuncioRef.current = ahora;
          ultimoRecordatorioRef.current = ahora;
        } else if (tocaRecordatorio) {
          // Recordatorio calmado: repite la misma instrucción cada cierto
          // tiempo, para confirmar que sigue guiando sin agobiar.
          hablarEnCola(nuevaInstruccion);
          ultimoRecordatorioRef.current = ahora;
        }
      }, EVALUAR_CADA_MS);
    })();
  }, [destino, ruta, userLocation]);

  const establecerDestino = useCallback(
    async (lugar: LugarBuscado, modoElegido: ModoTransporte) => {
      setDestino(lugar);
      setModo(modoElegido);
      setErrorMsg(null);
      if (userLocation) {
        await recalcularRuta(userLocation, lugar.coordenada, modoElegido);
      }
    },
    [userLocation, recalcularRuta]
  );

  const cambiarModo = useCallback(
    (nuevoModo: ModoTransporte) => {
      setModo(nuevoModo);
      if (destino && userLocation) {
        recalcularRuta(userLocation, destino.coordenada, nuevoModo);
      }
    },
    [destino, userLocation, recalcularRuta]
  );

  const limpiarDestino = useCallback(() => {
    setDestino(null);
    setRuta(null);
    setDistanciaRestante(null);
    detenerGuiaInterna();
    detenerVoz();
  }, []);

  return (
    <NavigationGuideContext.Provider
      value={{
        userLocation,
        accuracy,
        destino,
        ruta,
        calculandoRuta,
        siguiendo,
        instruccionActual,
        distanciaRestante,
        errorMsg,
        modo,
        establecerDestino,
        cambiarModo,
        limpiarDestino,
        iniciarGuia,
        detenerGuia,
      }}
    >
      {children}
    </NavigationGuideContext.Provider>
  );
}

export function useNavigationGuide() {
  const ctx = useContext(NavigationGuideContext);
  if (!ctx) throw new Error("useNavigationGuide debe usarse dentro de NavigationGuideProvider");
  return ctx;
}
