import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import Logo from "../components/Logo";
import { colors } from "../theme/colors";

WebBrowser.maybeCompleteAuthSession();

type Mode = "signIn" | "signUp" | "verify";

export default function LoginScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Nota: no hace falta redirigir manualmente tras iniciar sesión.
  // AppNavigator reacciona solo a isSignedIn y cambia de pantalla (y lo
  // mismo pasa al revés, al cerrar sesión desde Home).

  const onGooglePress = useCallback(async () => {
    try {
      setErrorMsg(null);
      setLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("Error de autenticación con Google:", err);
      setErrorMsg("No se pudo iniciar sesión con Google.");
    } finally {
      setLoading(false);
    }
  }, [startOAuthFlow]);

  const onEmailSignIn = useCallback(async () => {
    if (!signInLoaded) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === "complete") {
        await setActiveSignIn({ session: attempt.createdSessionId });
      } else {
        setErrorMsg("No se pudo completar el inicio de sesión.");
      }
    } catch (err: any) {
      setErrorMsg(err?.errors?.[0]?.message ?? "Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }, [signInLoaded, signIn, email, password, setActiveSignIn]);

  const onEmailSignUp = useCallback(async () => {
    if (!signUpLoaded) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setMode("verify");
    } catch (err: any) {
      setErrorMsg(err?.errors?.[0]?.message ?? "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }, [signUpLoaded, signUp, email, password]);

  const onVerifyCode = useCallback(async () => {
    if (!signUpLoaded) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (attempt.status === "complete") {
        await setActiveSignUp({ session: attempt.createdSessionId });
      } else {
        setErrorMsg("Código incorrecto o incompleto.");
      }
    } catch (err: any) {
      setErrorMsg(err?.errors?.[0]?.message ?? "No se pudo verificar el código.");
    } finally {
      setLoading(false);
    }
  }, [signUpLoaded, signUp, code, setActiveSignUp]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Logo size={64} wordmarkColor={colors.primary} wordmarkSize={24} />
        </View>

        {mode !== "verify" && (
          <>
            <Text style={styles.title} accessibilityRole="header">
              Bienvenido
            </Text>
            <Text style={styles.description}>
              {mode === "signIn"
                ? "Inicia sesión para continuar"
                : "Crea tu cuenta para continuar"}
            </Text>

            <Pressable
              style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
              onPress={onGooglePress}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión con Google"
              disabled={loading}
            >
              <Text style={styles.googleButtonText}>Continuar con Google</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o con tu correo</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Correo electrónico"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              accessibilityLabel="Contraseña"
            />

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={mode === "signIn" ? onEmailSignIn : onEmailSignUp}
              accessibilityRole="button"
              accessibilityLabel={mode === "signIn" ? "Iniciar sesión" : "Crear cuenta"}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === "signIn" ? "Iniciar sesión" : "Crear cuenta"}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setErrorMsg(null);
                setMode(mode === "signIn" ? "signUp" : "signIn");
              }}
              accessibilityRole="button"
            >
              <Text style={styles.switchModeText}>
                {mode === "signIn"
                  ? "¿No tienes cuenta? Crear una"
                  : "¿Ya tienes cuenta? Inicia sesión"}
              </Text>
            </Pressable>
          </>
        )}

        {mode === "verify" && (
          <>
            <Text style={styles.title} accessibilityRole="header">
              Verifica tu correo
            </Text>
            <Text style={styles.description}>
              Te enviamos un código a {email}. Ingrésalo aquí:
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Código de verificación"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              accessibilityLabel="Código de verificación"
            />
            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={onVerifyCode}
              accessibilityRole="button"
              accessibilityLabel="Verificar código"
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Verificar</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoWrap: { marginBottom: 32 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    marginBottom: 10,
    color: colors.primary,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    color: colors.black,
  },
  googleButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 280,
    alignItems: "center",
  },
  googleButtonText: {
    color: colors.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 280,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: colors.textMuted,
  },
  input: {
    width: 280,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: colors.black,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
    width: 280,
  },
  button: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 280,
    alignItems: "center",
    marginTop: 4,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    color: colors.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  switchModeText: {
    marginTop: 18,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: colors.primary,
  },
});
