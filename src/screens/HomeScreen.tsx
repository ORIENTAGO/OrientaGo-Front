import { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth } from "@clerk/clerk-expo";
import {
  Menu,
  UserCircle,
  Volume2,
  VolumeX,
  Camera,
  MapPin,
  AlertTriangle,
  Settings,
  Mic,
} from "lucide-react-native";
import type { MainTabParamList } from "../navigation/MainTabs";
import Logo from "../components/Logo";
import { useVoiceEnabled } from "../hooks/useVoiceEnabled";
import { colors } from "../theme/colors";

type NavProp = BottomTabNavigationProp<MainTabParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { signOut } = useAuth();
  const { activada: vozActivada, alternar: alternarVoz } = useVoiceEnabled();

  const onProfilePress = useCallback(() => {
    Alert.alert("Cuenta", "¿Deseas cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => signOut() },
    ]);
  }, [signOut]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir menú" hitSlop={12}>
          <Menu color={colors.black} size={24} />
        </Pressable>
        <Logo size={30} wordmarkColor={colors.primary} wordmarkSize={17} />
        <Pressable accessibilityRole="button" accessibilityLabel="Perfil, cerrar sesión" hitSlop={12} onPress={onProfilePress}>
          <UserCircle color={colors.black} size={26} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeBanner} accessibilityRole="text">
          <Volume2 color={colors.black} size={18} />
          <Text style={styles.welcomeText}>
            Bienvenido a OrientaGo. ¿Qué deseas hacer hoy?
          </Text>
        </View>

        <Pressable
          style={[styles.soundToggle, vozActivada ? styles.soundToggleOn : styles.soundToggleOff]}
          onPress={alternarVoz}
          accessibilityRole="button"
          accessibilityLabel={vozActivada ? "Voz activada. Toca para silenciar." : "Voz desactivada. Toca para activar."}
        >
          <View style={styles.soundToggleIconWrap}>
            {vozActivada ? (
              <Volume2 color={colors.white} size={26} />
            ) : (
              <VolumeX color={colors.white} size={26} />
            )}
          </View>
          <Text style={styles.soundToggleText}>
            {vozActivada ? "Voz activada — toca para silenciar" : "Voz desactivada — toca para activar"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.card, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("Explore")}
          accessibilityRole="button"
          accessibilityLabel="Analizar entorno. Reconoce objetos y obtén descripciones."
        >
          <View style={styles.cardIconWrap}>
            <Camera color={colors.white} size={22} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Analizar entorno</Text>
            <Text style={styles.cardSubtitle}>
              Reconoce objetos y obtén descripciones
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.card, { backgroundColor: colors.success }]}
          onPress={() => navigation.navigate("Guide")}
          accessibilityRole="button"
          accessibilityLabel="Navegación asistida. Orientación paso a paso a tu destino."
        >
          <View style={styles.cardIconWrap}>
            <MapPin color={colors.white} size={22} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Navegación asistida</Text>
            <Text style={styles.cardSubtitle}>
              Orientación paso a paso a tu destino
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.card, { backgroundColor: colors.danger }]}
          onPress={() =>
            Alert.alert(
              "Emergencia",
              "Esta función compartirá tu ubicación con tus contactos de confianza. (Próximamente)"
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Emergencia. Comparte tu ubicación con contactos."
        >
          <View style={styles.cardIconWrap}>
            <AlertTriangle color={colors.white} size={22} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Emergencia</Text>
            <Text style={styles.cardSubtitle}>
              Comparte tu ubicación con contactos
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.card, styles.cardLight]}
          onPress={() =>
            Alert.alert("Configuración", "Ajustes disponibles próximamente.")
          }
          accessibilityRole="button"
          accessibilityLabel="Configuración. Ajustes de voz, sonido y preferencias."
        >
          <View style={[styles.cardIconWrap, styles.cardIconWrapLight]}>
            <Settings color={colors.black} size={22} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={[styles.cardTitle, { color: colors.black }]}>
              Configuración
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Ajustes de voz, sonido y preferencias
            </Text>
          </View>
        </Pressable>

        <View style={styles.voiceHint}>
          <Mic color={colors.textMuted} size={16} />
          <Text style={styles.voiceHintText}>
            Desliza o usa comandos de voz para navegar
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  welcomeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  welcomeText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: colors.black,
  },
  soundToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 16,
  },
  soundToggleOn: {
    backgroundColor: colors.primary,
  },
  soundToggleOff: {
    backgroundColor: colors.textMuted,
  },
  soundToggleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  soundToggleText: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: colors.white,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 18,
  },
  cardLight: {
    backgroundColor: colors.backgroundGray,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconWrapLight: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: colors.white,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  voiceHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 24,
  },
  voiceHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: colors.textMuted,
  },
});
