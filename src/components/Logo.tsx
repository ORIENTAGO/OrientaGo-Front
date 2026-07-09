import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  wordmarkSize?: number;
};

/**
 * Ícono compacto de OrientaGo (persona con bastón + pin de ubicación) +
 * texto "OrientaGo". Se usa en lugares con poco espacio (header de Home,
 * Login). Para el lockup completo con eslogan, usar <LogoCompleto />.
 */
export default function Logo({
  size = 48,
  showWordmark = true,
  wordmarkColor = colors.white,
  wordmarkSize = 20,
}: Props) {
  return (
    <View style={styles.row}>
      <Image
        source={require("../../assets/logo-icon.png")}
        style={{ width: size, height: size * (655 / 801) }}
        resizeMode="contain"
      />
      {showWordmark && (
        <Text
          style={[styles.wordmark, { color: wordmarkColor, fontSize: wordmarkSize }]}
        >
          OrientaGo
        </Text>
      )}
    </View>
  );
}

/**
 * Lockup oficial completo: ícono + "OrientaGo" + eslogan, con su propio
 * fondo en degradado claro ya incluido en el diseño. Se usa en el Splash
 * y el Login, a tamaño grande.
 */
export function LogoCompleto({ width = 320 }: { width?: number }) {
  const height = width * (313 / 743);
  return (
    <Image
      source={require("../../assets/logo-lockup.png")}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="OrientaGo. Tu guía. Tu camino. Tu libertad."
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wordmark: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
