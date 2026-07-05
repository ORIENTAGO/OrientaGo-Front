import { useEffect, useRef } from "react";
import { View, Animated, Image, StyleSheet, Easing } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: Props) {
  const iconTranslateY = useRef(new Animated.Value(-160)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateX = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. El ícono empieza arriba y baja hasta su posición final
      Animated.timing(iconTranslateY, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 2. El texto "OrientaGo" se une al ícono
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkTranslateX, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setTimeout(onFinish, 600);
    });
  }, [iconTranslateY, wordmarkOpacity, wordmarkTranslateX, onFinish]);

  return (
    <View style={styles.container} accessibilityRole="none">
      <View style={styles.logoRow}>
        <Animated.Image
          source={require("../../assets/logo-icon.png")}
          style={[styles.icon, { transform: [{ translateY: iconTranslateY }] }]}
          resizeMode="contain"
        />
        <Animated.Text
          style={[
            styles.wordmark,
            { opacity: wordmarkOpacity, transform: [{ translateX: wordmarkTranslateX }] },
          ]}
        >
          OrientaGo
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 90,
    height: 70,
  },
  wordmark: {
    color: colors.white,
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    letterSpacing: 0.2,
  },
});
