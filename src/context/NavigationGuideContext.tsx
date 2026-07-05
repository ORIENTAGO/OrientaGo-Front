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

function instruccionPorRumbo(rumboDestino: number, direccionActual: number): string {
  const diff = ((rumboDestino - direccionActual + 540) % 360) - 180;
  if (Math.abs(diff) <= 20) return "Sigue recto.";
  if (diff > 20 && diff <= 160) return "Gira a la derecha.";
  if (diff < -20 && diff >= -160) return "Gira a la izquierda.";
  return "Da la vuelta, vas en dirección contraria.";
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
  const origenRutaRef = useRef<Coordenada | null>(null);
  const destinoRef = useRef<LugarBuscado | null>(null);
  const modoRef = useRef<ModoTransporte>("auto");
  const siguiendoRef = useRef(false);
  const ultimaInstruccionRef = useRef("");
  const ultimoAnuncioRef = useRef(0);

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
    hablarEnCola(
      `Iniciando guía hacia ${destino.nombreCorto}. ${formatearDistancia(ruta.distanciaMetros)}, ${formatearDuracion(ruta.duracionSegundos)}.`
    );
    (async () => {
      watchHeadingRef.current = await seguirBrujula((gradosNorte) => {
        if (!userLocation || !destinoRef.current) return;
        const rumbo = calcularRumbo(userLocation, destinoRef.current.coordenada);
        const instruccion = instruccionPorRumbo(rumbo, gradosNorte);
        setInstruccionActual(instruccion);

        const ahora = Date.now();
        const cambio = instruccion !== ultimaInstruccionRef.current;
        const pasaronVarios = ahora - ultimoAnuncioRef.current > 8000;
        if (cambio || pasaronVarios) {
          hablarEnCola(instruccion);
          ultimaInstruccionRef.current = instruccion;
          ultimoAnuncioRef.current = ahora;
        }
      });
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
