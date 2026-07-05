import { View, Text, Pressable, StyleSheet } from "react-native";
import { Navigation2, Volume2, Square } from "lucide-react-native";
import { useNavigationGuide, formatearDistancia } from "../context/NavigationGuideContext";
import { hablarEnCola } from "../services/speechService";
import { colors } from "../theme/colors";

/**
 * Se muestra flotando sobre cualquier pestaña (Home, Explore, Guide)
 * mientras la guía por voz está activa, para que la persona no vidente
 * pueda repetir la instrucción o detener la guía sin tener que buscar
 * la pestaña de Navegación.
 */
export default function GuideStatusBar() {
  const { siguiendo, destino, instruccionActual, distanciaRestante, detenerGuia } = useNavigationGuide();

  if (!siguiendo || !destino) return null;

  const onRepetir = () => {
    const texto = `${instruccionActual || "Calculando dirección"}. ${
      distanciaRestante !== null ? `Faltan ${formatearDistancia(distanciaRestante)}.` : ""
    }`;
    hablarEnCola(texto);
  };

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.iconWrap}>
        <Navigation2 color={colors.white} size={16} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          Guiando hacia {destino.nombreCorto}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {instruccionActual || "Calculando dirección…"}
          {distanciaRestante !== null ? ` · ${formatearDistancia(distanciaRestante)}` : ""}
        </Text>
      </View>
      <Pressable
        style={styles.iconButton}
        onPress={onRepetir}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Repetir instrucción de navegación"
      >
        <Volume2 color={colors.white} size={20} />
      </Pressable>
      <Pressable
        style={[styles.iconButton, styles.stopButton]}
        onPress={detenerGuia}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Detener guía de navegación"
      >
        <Square color={colors.white} size={16} fill={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 76, // justo encima de la barra de pestañas
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    padding: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.white, fontFamily: "Inter_700Bold", fontSize: 12 },
  subtitle: { color: "#CFE0F0", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: { backgroundColor: colors.danger },
});
