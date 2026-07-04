import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

// Clean Architecture imports
import { Detection } from "../../domain/entities/Detection";
import { DetectionRepositoryImpl } from "../../data/repositories/DetectionRepositoryImpl";
import { SpeechServiceImpl } from "../../data/services/SpeechServiceImpl";
import { HapticServiceImpl } from "../../data/services/HapticServiceImpl";

// Frecuencia de envío de frames al servidor. 700ms es un buen punto de
// partida para la demo por WiFi; bájalo si el servidor responde rápido.
const FRAME_INTERVAL_MS = 700;
// Evita repetir la misma alerta de voz todo el tiempo
const ALERT_COOLDOWN_MS = 3000;

export default function WalkModeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [lastMessage, setLastMessage] = useState("Iniciando detección...");
  const lastAlertLabelRef = useRef<string | null>(null);
  const lastAlertTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  // Instanciar servicios de la capa de datos
  const detectionRepository = useMemo(() => new DetectionRepositoryImpl(), []);
  const speechService = useMemo(() => new SpeechServiceImpl(), []);
  const hapticService = useMemo(() => new HapticServiceImpl(), []);

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
    speechService.speak(mensaje);
    hapticService.triggerWarning();
  }, [speechService, hapticService]);

  const captureAndDetect = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        skipProcessing: true,
      });
      if (!photo?.uri) return;

      const detections = await detectionRepository.detectFrame(photo.uri);
      if (detections.length > 0) {
        // Alerta sobre la detección más cercana (mayor prioridad)
        const closest = detections.reduce((a, b) =>
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
  }, [detectionRepository, speakAlert]);

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
          router.back();
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
