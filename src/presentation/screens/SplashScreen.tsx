import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 1800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container} accessibilityRole="none">
      <Text style={styles.title} accessibilityRole="header">
        Asistente Visual
      </Text>
      <Text style={styles.subtitle}>Tus ojos, en tu bolsillo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C447C",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#E8F0FA",
    fontSize: 16,
  },
});
