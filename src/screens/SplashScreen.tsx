import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import { LogoCompleto } from "../components/Logo";
import { colors } from "../theme/colors";

type Props = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(onFinish, 1000);
    });
  }, [opacity, scale, onFinish]);

  return (
    <View style={styles.container} accessibilityRole="none">
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <LogoCompleto width={320} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.splashBackground,
    alignItems: "center",
    justifyContent: "center",
  },
});
