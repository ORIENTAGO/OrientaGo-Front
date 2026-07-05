import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  wordmarkSize?: number;
};

/**
 * Logo de OrientaGo: ícono real exportado de Figma (assets/logo-icon.png)
 * + wordmark en texto (para poder cambiar su color según la pantalla:
 * blanco en el Splash, azul oscuro en Home/Login, etc.)
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
        style={{ width: size, height: size * 0.78 }}
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
