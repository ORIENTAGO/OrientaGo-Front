import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useOAuth, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { isSignedIn } = useAuth();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/home");
    }
  }, [isSignedIn, router]);

  const onGooglePress = useCallback(async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("Error de autenticación con Google:", err);
    } finally {
      setLoading(false);
    }
  }, [startOAuthFlow]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Bienvenido
      </Text>
      <Text style={styles.description}>
        Inicia sesión con tu cuenta de Google para continuar
      </Text>

      <Pressable
        style={styles.button}
        onPress={onGooglePress}
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión con Google"
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Iniciar sesión con Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0C447C",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: "#333333",
  },
  button: {
    backgroundColor: "#0C447C",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 260,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
