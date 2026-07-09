import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { detectFrame, Detection } from "../services/detectionService";

type Props = NativeStackScreenProps<RootStackParamList, "WalkMode">;

// Frecuencia de envío de frames al servidor 700ms
const FRAME_INTERVAL_MS = 700;
// Evita repetir la misma alerta de voz todo el tiempo
const ALERT_COOLDOWN_MS = 3000;
// Solo alertar si el obstáculo está a menos de esta distancia (metros)
const DISTANCE_DANGER_M = 2.0;

export default function WalkModeScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [lastMessage, setLastMessage] = useState("Iniciando detección...");
  const lastAlertLabelRef = useRef<string | null>(null);
  const lastAlertTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const speakAlert = useCallback((detection: Detection) => {
    const now = Date.now();
    const isSameLabel = lastAlertLabelRef.current === detection.label;
    const withinCooldown = now - lastAlertTimeRef.current < ALERT_COOLDOWN_MS;
    if (isSameLabel && withinCooldown) return;

    lastAlertLabelRef.current = detection.label;
    lastAlertTimeRef.current = now;

    const mensaje = `Cuidado, ${detection.label} a ${detection.distancia_aprox_m} metros`;
    setLastMessage(mensaje);
    Speech.speak(mensaje, { language: "es-EC" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const captureAndDetect = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.15,
        skipProcessing: true,
      });
      if (!photo?.uri) return;

      const detections = await detectFrame(photo.uri);
      // Solo considerar obstáculos en trayectoria directa y cercanos
      const dangerous = detections.filter(
        (d) => d.en_trayectoria && d.distancia_aprox_m <= DISTANCE_DANGER_M
      );
      if (dangerous.length > 0) {
        const closest = dangerous.reduce((a, b) =>
          a.distancia_aprox_m < b.distancia_aprox_m ? a : b
        );
        speakAlert(closest);
      } else {
        setLastMessage("Camino despejado");
      }
    } catch (err) {
      console.error("Error al detectar frame:", err);
      setLastMessage("Sin conexión con el servidor de detección");
    }
  }, [speakAlert]);

  useEffect(() => {
    if (isRunning && permission?.granted) {
      intervalRef.current = setInterval(captureAndDetect, FRAME_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, permission, captureAndDetect]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Se necesita acceso a la cámara para el modo caminata.
        </Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Dar permiso</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.overlay}>
        <Text style={styles.statusText} accessibilityLiveRegion="polite">
          {lastMessage}
        </Text>
        <View style={styles.privacyBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.privacyText}>
            Cámara activa · Nada se graba ni se guarda
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.exitButton}
        onPress={() => {
          setIsRunning(false);
          navigation.goBack();
        }}
        accessibilityRole="button"
        accessibilityLabel="Salir del modo caminata"
      >
        <Text style={styles.buttonText}>Salir</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionText: {
    color: "#FFFFFF",
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
    paddingHorizontal: 24,
  },
  overlay: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    alignItems: "center",
    gap: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3B6D11",
  },
  privacyText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  exitButton: {
    position: "absolute",
    bottom: 48,
    alignSelf: "center",
    backgroundColor: "#A32D2D",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  button: {
    backgroundColor: "#0C447C",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
