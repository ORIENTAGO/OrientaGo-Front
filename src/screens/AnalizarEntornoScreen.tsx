import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { ChevronLeft, Volume2, Play, Square, Navigation2, SwitchCamera } from "lucide-react-native";
import type { MainTabParamList } from "../navigation/MainTabs";
import { detectFrame, Detection } from "../services/detectionService";
import { hablarPrioridad, hablarEnCola } from "../services/speechService";
import { useVoiceEnabled } from "../hooks/useVoiceEnabled";
import { useNavigationGuide, formatearDistancia } from "../context/NavigationGuideContext";
import { colors } from "../theme/colors";

type NavProp = BottomTabNavigationProp<MainTabParamList, "Explore">;

const FRAME_INTERVAL_MS = 1000;
const ALERT_COOLDOWN_MS = 3000;
const CLEAR_ANNOUNCE_INTERVAL_MS = 8000;
const PROXIMIDAD_ALERTA_M = 2.0; // solo avisa de obstáculos dentro de este radio
const BOX_COLORS = [colors.success, "#D9A400", colors.primary, colors.danger];

const { width: SCREEN_W } = Dimensions.get("window");
const PREVIEW_HEIGHT = SCREEN_W * (4 / 3);

function labelFor(d: Detection) {
  const nombre = d.label.charAt(0).toUpperCase() + d.label.slice(1);
  return `${nombre} ${d.distancia_aprox_m} m`;
}

/** Mensaje corto, con la urgencia justa según qué tan cerca está — no
 * siempre "Cuidado", para que la voz no se sienta pesada/repetitiva. */
function mensajeAlerta(d: Detection): string {
  const nombre = d.label;
  if (d.distancia_aprox_m <= 1.0) return `¡Cuidado! ${nombre} muy cerca.`;
  if (d.distancia_aprox_m <= 1.5) return `${nombre} cerca, cuidado.`;
  return `${nombre} a ${d.distancia_aprox_m} metros.`;
}

export default function AnalizarEntornoScreen() {
  const navigation = useNavigation<NavProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { activada: voiceEnabled, alternar: alternarVoz } = useVoiceEnabled();
  const { siguiendo: navegandoActivo, instruccionActual, destino: destinoActivo, distanciaRestante } =
    useNavigationGuide();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [description, setDescription] = useState(
    "Presiona “Iniciar análisis” para comenzar."
  );
  const lastAlertLabelRef = useRef<string | null>(null);
  const lastAlertTimeRef = useRef(0);
  const lastClearAnnounceRef = useRef(0);
  const isCapturingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  const alternarCamara = useCallback(() => {
    setFacing((f) => {
      const nueva = f === "back" ? "front" : "back";
      hablarPrioridad(nueva === "front" ? "Cámara frontal activada" : "Cámara trasera activada");
      return nueva;
    });
  }, []);

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

      hablarPrioridad(mensajeAlerta(detection));
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
        quality: 0.4,
        skipProcessing: true,
        shutterSound: false,
      });
      if (!photo?.uri) return;

      const dets = await detectFrame(photo.uri);
      setDetections(dets);
      setDescription(buildDescription(dets));

      // Solo avisa por voz de lo que realmente importa: obstáculos dentro
      // del radio de proximidad. Algo detectado lejos (ej. un carro a
      // 8 metros) no amerita interrumpir con una alerta todavía.
      const cercanos = dets.filter((d) => d.distancia_aprox_m <= PROXIMIDAD_ALERTA_M);

      if (cercanos.length > 0) {
        const masCercano = cercanos.reduce((a, b) =>
          a.distancia_aprox_m < b.distancia_aprox_m ? a : b
        );
        speakAlert(masCercano);
      } else {
        // Sin obstáculos cerca: igual confirma por voz cada cierto tiempo
        // que el análisis sigue activo (el silencio total no distingue
        // entre "todo despejado" y "se quedó pegado").
        const ahora = Date.now();
        if (ahora - lastClearAnnounceRef.current > CLEAR_ANNOUNCE_INTERVAL_MS) {
          hablarEnCola("Camino despejado.");
          lastClearAnnounceRef.current = ahora;
        }
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
      lastClearAnnounceRef.current = Date.now();
      intervalRef.current = setInterval(captureAndDetect, FRAME_INTERVAL_MS);
    }
  }, [isAnalyzing, stopAnalysis, captureAndDetect]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onDescribePress = useCallback(() => {
    if (navegandoActivo && destinoActivo) {
      const partesRuta = `Vas hacia ${destinoActivo.nombreCorto}. ${instruccionActual || "Calculando dirección."}${
        distanciaRestante !== null ? ` Faltan ${formatearDistancia(distanciaRestante)}.` : ""
      }`;
      hablarPrioridad(`${description} ${partesRuta}`);
    } else {
      hablarPrioridad(description);
    }
  }, [description, navegandoActivo, destinoActivo, instruccionActual, distanciaRestante]);

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
        <View style={styles.headerActions}>
          <Pressable
            onPress={alternarCamara}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={facing === "back" ? "Cambiar a cámara frontal" : "Cambiar a cámara trasera"}
          >
            <SwitchCamera color={colors.white} size={22} />
          </Pressable>
          <Pressable
            onPress={alternarVoz}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={voiceEnabled ? "Silenciar voz" : "Activar voz"}
          >
            <Volume2 color={voiceEnabled ? colors.white : "#7A93AC"} size={22} />
          </Pressable>
        </View>
      </View>

      <View style={styles.previewWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} animateShutter={false} />

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

        {navegandoActivo && destinoActivo && (
          <View style={styles.navBanner} accessibilityLiveRegion="polite">
            <Navigation2 color={colors.white} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.navBannerTitle} numberOfLines={1}>
                Hacia {destinoActivo.nombreCorto}
              </Text>
              <Text style={styles.navBannerSubtitle} numberOfLines={1}>
                {instruccionActual || "Calculando dirección…"}
                {distanciaRestante !== null ? ` · ${formatearDistancia(distanciaRestante)}` : ""}
              </Text>
            </View>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
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
  navBanner: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(12,68,124,0.92)",
    borderRadius: 12,
    padding: 12,
  },
  navBannerTitle: { color: colors.white, fontFamily: "Inter_700Bold", fontSize: 13 },
  navBannerSubtitle: { color: "#CFE0F0", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
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
