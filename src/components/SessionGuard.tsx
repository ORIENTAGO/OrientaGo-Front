import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@clerk/clerk-expo";

const LAST_BACKGROUND_KEY = "orientago_last_background_at";
// Tiempo de inactividad antes de pedir inicio de sesión de nuevo.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

/**
 * No renderiza nada. Vigila cuándo la app pasa a segundo plano y, si al
 * volver ha pasado más de SESSION_TIMEOUT_MS, cierra la sesión para que
 * el usuario vea la pantalla de Login de nuevo.
 */
export default function SessionGuard() {
  const { isSignedIn, signOut } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const checkTimeoutOnResume = async () => {
      try {
        const lastBackground = await SecureStore.getItemAsync(LAST_BACKGROUND_KEY);
        if (lastBackground && isSignedIn) {
          const elapsed = Date.now() - parseInt(lastBackground, 10);
          if (elapsed > SESSION_TIMEOUT_MS) {
            await signOut();
          }
        }
      } catch {
        // Si falla la lectura, no bloqueamos la app por esto.
      }
    };

    const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/active/) && next.match(/inactive|background/)) {
        SecureStore.setItemAsync(LAST_BACKGROUND_KEY, String(Date.now())).catch(() => {});
      }
      if (appState.current.match(/inactive|background/) && next === "active") {
        checkTimeoutOnResume();
      }
      appState.current = next;
    });

    // También revisa al montar (por si la app fue cerrada del todo).
    checkTimeoutOnResume();

    return () => subscription.remove();
  }, [isSignedIn, signOut]);

  return null;
}
