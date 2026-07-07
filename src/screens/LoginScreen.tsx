import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useOAuth } from "@clerk/clerk-expo";
import { LogoCompleto } from "../components/Logo";
import { colors } from "../theme/colors";
import { hablarPrioridad } from "../services/speechService";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // La pantalla se anuncia sola por voz: no hace falta leer nada en pantalla.
    hablarPrioridad("Bienvenido a OrientaGo. Toca el botón para ingresar.");
  }, []);

  const onIngresar = useCallback(async () => {
    try {
      setErrorMsg(null);
      setLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // Al quedar activa la sesión, AppNavigator cambia solo a la app principal.
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error de autenticación:", err);
      setErrorMsg("No se pudo iniciar sesión. Intenta de nuevo.");
      hablarPrioridad("No se pudo iniciar sesión. Intenta de nuevo.");
      setLoading(false);
    }
  }, [startOAuthFlow]);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <LogoCompleto width={280} />
      </View>

      <Text style={styles.description}>
        Toca el botón para ingresar con tu cuenta de Google
      </Text>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onIngresar}
        accessibilityRole="button"
        accessibilityLabel="Ingresar a OrientaGo"
        accessibilityHint="Toca dos veces para iniciar sesión con tu cuenta de Google"
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} size="large" />
        ) : (
          <Text style={styles.buttonText}>INGRESAR</Text>
        )}
      </Pressable>

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoWrap: { marginBottom: 56 },
  description: {
    fontFamily: "Inter_500Medium",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 36,
    color: colors.black,
  },
  button: {
    backgroundColor: colors.primary,
    width: "100%",
    paddingVertical: 28,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 96,
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: {
    color: colors.white,
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: 1,
  },
  errorText: {
    color: colors.danger,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginTop: 24,
    textAlign: "center",
  },
});
