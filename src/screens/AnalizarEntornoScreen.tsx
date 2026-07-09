import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { ChevronLeft, Volume2, Play, Square } from "lucide-react-native";
import type { MainTabParamList } from "../navigation/MainTabs";
import { detectFrame, Detection } from "../services/detectionService";
import { hablarPrioridad } from "../services/speechService";
import { colors } from "../theme/colors";

type NavProp = BottomTabNavigationProp<MainTabParamList, "Explore">;

const FRAME_INTERVAL_MS = 1000;
const ALERT_COOLDOWN_MS = 3000;
// Solo alertar por voz si el obstáculo está a menos de esta distancia (metros)
const DISTANCE_DANGER_M = 2.0;
const BOX_COLORS = [colors.success, "#D9A400", colors.primary, colors.danger];

const { width: SCREEN_W } = Dimensions.get("window");
const PREVIEW_HEIGHT = SCREEN_W * (4 / 3);

function labelFor(d: Detection) {
  const nombre = d.label.charAt(0).toUpperCase() + d.label.slice(1);
  return `${nombre} ${d.distancia_aprox_m} m`;
}

export default function AnalizarEntornoScreen() {
  const navigation = useNavigation<NavProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [description, setDescription] = useState(
    "Presiona “Iniciar análisis” para comenzar."
  );
  const lastAlertLabelRef = useRef<string | null>(null);
  const lastAlertTimeRef = useRef(0);
  const isCapturingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  const stopAnalysis = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  // Pausa automáticamente el análisis (cámara + voz) al salir de esta pestaña,
  // para que no se siga ejecutando en segundo plano.
  useFocusEffect(
    useCallback(() => {
      return () => {
        stopAnalysis();
      };
    }, [stopAnalysis])
  );

  const buildDescription = useCallback((dets: Detection[]) => {
    if (dets.length === 0) return "Camino despejado.";
    const ordenado = [...dets].sort(
      (a, b) => a.distancia_aprox_m - b.distancia_aprox_m
    );
    return ordenado
      .map((d) => `Hay ${d.label} a ${d.distancia_aprox_m} metros.`)
      .join(" ");
  }, []);

  const speakAlert = useCallback(
    (detection: Detection) => {
      if (!voiceEnabled) return;
      const now = Date.now();
      const isSameLabel = lastAlertLabelRef.current === detection.label;
      const withinCooldown = now - lastAlertTimeRef.current < ALERT_COOLDOWN_MS;
      if (isSameLabel && withinCooldown) return;

      lastAlertLabelRef.current = detection.label;
      lastAlertTimeRef.current = now;

      hablarPrioridad(`Cuidado, ${detection.label} a ${detection.distancia_aprox_m} metros`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [voiceEnabled]
  );

  const captureAndDetect = useCallback(async () => {
    if (!cameraRef.current) return;
    if (isCapturingRef.current) return; // evita solapar capturas si la anterior no ha terminado
    isCapturingRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.15,
        skipProcessing: true,
        shutterSound: false,
      });
      if (!photo?.uri) return;

      const dets = await detectFrame(photo.uri);
      setDetections(dets);
      setDescription(buildDescription(dets));

      // Solo alertar por voz si hay obstáculos en trayectoria directa y cercanos
      const dangerous = dets.filter(
        (d) => d.en_trayectoria && d.distancia_aprox_m <= DISTANCE_DANGER_M
      );
      if (dangerous.length > 0) {
        const closest = dangerous.reduce((a, b) =>
          a.distancia_aprox_m < b.distancia_aprox_m ? a : b
        );
        speakAlert(closest);
      }
    } catch (err) {
      console.error("Error al detectar frame:", err);
      setDescription("Sin conexión con el servidor de detección.");
    } finally {
      isCapturingRef.current = false;
    }
  }, [buildDescription, speakAlert]);

  const toggleAnalysis = useCallback(() => {
    if (isAnalyzing) {
      stopAnalysis();
      setDescription("Análisis detenido.");
      setDetections([]);
    } else {
      setIsAnalyzing(true);
      setDescription("Analizando…");
      intervalRef.current = setInterval(captureAndDetect, FRAME_INTERVAL_MS);
    }
  }, [isAnalyzing, stopAnalysis, captureAndDetect]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onDescribePress = useCallback(() => {
    hablarPrioridad(description);
  }, [description]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate("Home")} hitSlop={12}>
            <ChevronLeft color={colors.white} size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>ANALIZAR ENTORNO</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionText}>
            Se necesita acceso a la cámara para analizar tu entorno.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Dar permiso</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.navigate("Home")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
        >
          <ChevronLeft color={colors.white} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>ANALIZAR ENTORNO</Text>
        <Pressable
          onPress={() => setVoiceEnabled((v) => !v)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={voiceEnabled ? "Silenciar voz" : "Activar voz"}
        >
          <Volume2 color={voiceEnabled ? colors.white : "#7A93AC"} size={22} />
        </Pressable>
      </View>

      <View style={styles.previewWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" animateShutter={false} />

        {isAnalyzing &&
          detections.map((d, i) => {
            const boxColor = BOX_COLORS[i % BOX_COLORS.length];
            const left = d.bbox[0] * SCREEN_W;
            const top = d.bbox[1] * PREVIEW_HEIGHT;
            const boxWidth = (d.bbox[2] - d.bbox[0]) * SCREEN_W;
            const boxHeight = (d.bbox[3] - d.bbox[1]) * PREVIEW_HEIGHT;
            return (
              <View
                key={`${d.label}-${i}`}
                style={[
                  styles.boundingBox,
                  { borderColor: boxColor, left, top, width: boxWidth, height: boxHeight },
                ]}
              >
                <Text style={[styles.boxLabel, { backgroundColor: boxColor }]}>
                  {labelFor(d)}
                </Text>
              </View>
            );
          })}

        {!isAnalyzing && (
          <View style={styles.idleOverlay}>
            <Text style={styles.idleOverlayText}>Análisis en pausa</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomPanel}>
        <Pressable
          style={[
            styles.startStopButton,
            { backgroundColor: isAnalyzing ? colors.danger : colors.success },
          ]}
          onPress={toggleAnalysis}
          accessibilityRole="button"
          accessibilityLabel={isAnalyzing ? "Detener análisis" : "Iniciar análisis"}
        >
          {isAnalyzing ? (
            <Square color={colors.white} size={18} fill={colors.white} />
          ) : (
            <Play color={colors.white} size={18} fill={colors.white} />
          )}
          <Text style={styles.startStopText}>
            {isAnalyzing ? "Detener análisis" : "Iniciar análisis"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.describePill}
          onPress={onDescribePress}
          accessibilityRole="button"
          accessibilityLabel="Toca para describir entorno"
        >
          <Text style={styles.describePillText}>Toca para describir entorno</Text>
        </Pressable>

        <View style={styles.descriptionCard}>
          <Volume2 color={colors.textMuted} size={16} />
          <View style={{ flex: 1 }}>
            <Text style={styles.descriptionLabel}>Descripción</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 18,
  },
  headerTitle: {
    color: colors.white,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  previewWrap: { flex: 1, backgroundColor: colors.black },
  idleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  idleOverlayText: {
    color: colors.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  boundingBox: { position: "absolute", borderWidth: 2, borderRadius: 4 },
  boxLabel: {
    position: "absolute",
    bottom: -22,
    left: -2,
    color: colors.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  permissionWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  permissionText: {
    color: colors.white,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  permissionButtonText: { color: colors.white, fontFamily: "Inter_600SemiBold", fontSize: 16 },
  bottomPanel: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
    alignItems: "center",
  },
  startStopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
  },
  startStopText: { color: colors.white, fontFamily: "Inter_700Bold", fontSize: 14 },
  describePill: { backgroundColor: colors.black, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  describePillText: { color: colors.white, fontFamily: "Inter_500Medium", fontSize: 13 },
  descriptionCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    padding: 14,
    width: "100%",
  },
  descriptionLabel: { fontFamily: "Inter_700Bold", fontSize: 13, color: colors.black, marginBottom: 2 },
  descriptionText: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.textMuted },
});
