import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  ChevronLeft,
  Volume2,
  MapPin,
  Search,
  Car,
  PersonStanding,
  Bike,
  ExternalLink,
  X,
  Locate,
  Layers,
  Play,
  Square,
} from "lucide-react-native";
import type { MainTabParamList } from "../navigation/MainTabs";
import { colors } from "../theme/colors";
import type { LugarBuscado, ModoTransporte } from "../types/geo";
import { buscarLugares } from "../services/routeService";
import { hablarEnCola } from "../services/speechService";
import { useNavigationGuide, formatearDistancia, formatearDuracion } from "../context/NavigationGuideContext";
import LeafletMapView, { LeafletMapHandle, TipoMapa } from "../components/LeafletMapView";

type NavProp = BottomTabNavigationProp<MainTabParamList, "Guide">;

export default function NavegacionAsistidaScreen() {
  const navigation = useNavigation<NavProp>();
  const mapRef = useRef<LeafletMapHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    userLocation,
    accuracy,
    destino,
    ruta,
    calculandoRuta,
    siguiendo,
    errorMsg,
    modo,
    establecerDestino,
    cambiarModo,
    limpiarDestino,
    iniciarGuia,
    detenerGuia,
  } = useNavigationGuide();

  const [mapType, setMapType] = useState<TipoMapa>("standard");
  const [query, setQuery] = useState("");
  const [sugerencias, setSugerencias] = useState<LugarBuscado[]>([]);
  const [buscando, setBuscando] = useState(false);

  const onChangeQuery = useCallback(
    (texto: string) => {
      setQuery(texto);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!texto.trim()) {
        setSugerencias([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setBuscando(true);
        try {
          const resultados = await buscarLugares(texto, userLocation ?? undefined);
          setSugerencias(resultados);
        } catch {
          // Autocompletado silencioso
        } finally {
          setBuscando(false);
        }
      }, 450);
    },
    [userLocation]
  );

  const onSeleccionarLugar = useCallback(
    async (lugar: LugarBuscado) => {
      setQuery(lugar.nombreCorto);
      setSugerencias([]);
      hablarEnCola(`Destino seleccionado: ${lugar.nombreCorto}`);
      await establecerDestino(lugar, modo);
    },
    [establecerDestino, modo]
  );

  const onLimpiar = useCallback(() => {
    setQuery("");
    setSugerencias([]);
    limpiarDestino();
  }, [limpiarDestino]);

  const onAbrirEnMaps = useCallback(() => {
    if (!destino) return;
    const origenParam = userLocation ? `&origin=${userLocation.latitud},${userLocation.longitud}` : "";
    const modoParam = modo === "auto" ? "driving" : modo === "caminando" ? "walking" : "bicycling";
    const url = `https://www.google.com/maps/dir/?api=1${origenParam}&destination=${destino.coordenada.latitud},${destino.coordenada.longitud}&travelmode=${modoParam}`;
    Linking.openURL(url).catch(() => {});
  }, [destino, userLocation, modo]);

  const rutaPuntos = ruta?.puntos ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate("Home")} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver al inicio">
            <ChevronLeft color={colors.white} size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Mapa</Text>
          <Pressable
            onPress={() =>
              hablarEnCola(
                destino && ruta
                  ? `Destino: ${destino.nombreCorto}. ${formatearDistancia(ruta.distanciaMetros)}, ${formatearDuracion(ruta.duracionSegundos)}.`
                  : "Aún no has elegido un destino."
              )
            }
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Escuchar resumen del destino"
          >
            <Volume2 color={colors.white} size={22} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            <Search color={colors.textMuted} size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar destino (o dicta con el micrófono del teclado)"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={onChangeQuery}
              accessibilityLabel="Buscar destino"
            />
            {buscando && <ActivityIndicator size="small" color={colors.primary} />}
            {!!query && !buscando && (
              <Pressable onPress={onLimpiar} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
                <X color={colors.textMuted} size={18} />
              </Pressable>
            )}
          </View>

          {sugerencias.length > 0 && (
            <FlatList
              style={styles.suggestionsList}
              data={sugerencias}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.suggestionItem}
                  onPress={() => onSeleccionarLugar(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar ${item.nombreCorto}`}
                >
                  <MapPin color={colors.primary} size={16} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionTitle}>{item.nombreCorto}</Text>
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                      {item.direccionCompleta}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>

        {errorMsg && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.modeRow}>
          {(
            [
              { modo: "auto" as ModoTransporte, Icon: Car, label: "Auto" },
              { modo: "caminando" as ModoTransporte, Icon: PersonStanding, label: "Caminando" },
              { modo: "bicicleta" as ModoTransporte, Icon: Bike, label: "Bici" },
            ]
          ).map(({ modo: m, Icon, label }) => (
            <Pressable
              key={m}
              style={[styles.modeButton, modo === m && styles.modeButtonActive]}
              onPress={() => cambiarModo(m)}
              accessibilityRole="button"
              accessibilityLabel={`Modo ${label}`}
            >
              <Icon color={modo === m ? colors.white : colors.primary} size={16} />
              <Text style={[styles.modeButtonText, modo === m && styles.modeButtonTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.mapWrap}>
          <LeafletMapView
            ref={mapRef}
            userLocation={userLocation}
            accuracyMeters={accuracy}
            destination={destino?.coordenada ?? null}
            routePoints={rutaPuntos}
            mapType={mapType}
          />

          <Pressable
            style={styles.floatingButton}
            onPress={() => mapRef.current?.recentrar()}
            accessibilityRole="button"
            accessibilityLabel="Centrar en mi ubicación"
          >
            <Locate color={colors.primary} size={20} />
          </Pressable>
          <Pressable
            style={[styles.floatingButton, { top: 60 }]}
            onPress={() => setMapType((t) => (t === "standard" ? "satellite" : "standard"))}
            accessibilityRole="button"
            accessibilityLabel="Cambiar tipo de mapa"
          >
            <Layers color={colors.primary} size={20} />
          </Pressable>
        </View>

        {ruta && destino && (
          <View style={styles.infoPanel}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoDestino}>{destino.nombreCorto}</Text>
              <Text style={styles.infoDetalle}>
                {formatearDistancia(ruta.distanciaMetros)} · {formatearDuracion(ruta.duracionSegundos)}
                {ruta.esEstimado ? " · estimado" : ""}
              </Text>
            </View>
            <Pressable onPress={onAbrirEnMaps} hitSlop={10} accessibilityRole="button" accessibilityLabel="Abrir en Google Maps">
              <ExternalLink color={colors.primary} size={20} />
            </Pressable>
          </View>
        )}

        {calculandoRuta && (
          <View style={styles.calculatingBanner}>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.calculatingText}>Calculando ruta…</Text>
          </View>
        )}

        <Pressable
          style={[
            styles.startButton,
            { backgroundColor: siguiendo ? colors.danger : colors.success, opacity: destino && ruta ? 1 : 0.5 },
          ]}
          onPress={siguiendo ? detenerGuia : iniciarGuia}
          disabled={!destino || !ruta}
          accessibilityRole="button"
          accessibilityLabel={siguiendo ? "Detener guía por voz" : "Iniciar guía por voz"}
        >
          {siguiendo ? (
            <Square color={colors.white} size={18} fill={colors.white} />
          ) : (
            <Play color={colors.white} size={18} fill={colors.white} />
          )}
          <Text style={styles.startButtonText}>{siguiendo ? "DETENER GUÍA" : "INICIAR GUÍA POR VOZ"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundGray },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 18,
  },
  headerTitle: { color: colors.white, fontFamily: "Inter_700Bold", fontSize: 15 },
  searchWrap: { paddingHorizontal: 14, paddingTop: 12, zIndex: 20 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: colors.black },
  suggestionsList: {
    backgroundColor: colors.white,
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.black },
  suggestionSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.textMuted },
  warningBanner: { backgroundColor: "#FBEAEA", borderRadius: 10, padding: 10, marginHorizontal: 14, marginTop: 8 },
  warningText: { fontFamily: "Inter_500Medium", fontSize: 12, color: colors.danger },
  modeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeButtonText: { fontFamily: "Inter_500Medium", fontSize: 12, color: colors.primary },
  modeButtonTextActive: { color: colors.white },
  mapWrap: { flex: 1, marginHorizontal: 14, borderRadius: 14, overflow: "hidden", position: "relative" },
  floatingButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  infoPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
  },
  infoDestino: { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.black },
  infoDetalle: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.textMuted },
  calculatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 8,
  },
  calculatingText: { color: colors.white, fontFamily: "Inter_500Medium", fontSize: 12 },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  startButtonText: { color: colors.white, fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 0.4 },
});
