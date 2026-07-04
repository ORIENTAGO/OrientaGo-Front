import { View, Text, StyleSheet, Pressable } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Menú principal
      </Text>

      <Pressable
        style={styles.optionButton}
        onPress={() => router.push("/walk")}
        accessibilityRole="button"
        accessibilityLabel="Activar modo caminata, detección de personas en tiempo real"
      >
        <Text style={styles.optionText}>Modo Caminata</Text>
      </Pressable>

      <Pressable
        style={[styles.optionButton, styles.disabled]}
        disabled
        accessibilityRole="button"
        accessibilityLabel="Modo exploración, disponible próximamente"
      >
        <Text style={styles.optionText}>Modo Exploración (próximamente)</Text>
      </Pressable>

      <Pressable
        style={[styles.optionButton, styles.disabled]}
        disabled
        accessibilityRole="button"
        accessibilityLabel="Modo lectura, disponible próximamente"
      >
        <Text style={styles.optionText}>Modo Lectura (próximamente)</Text>
      </Pressable>

      <Pressable
        style={styles.signOutButton}
        onPress={() => signOut()}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 80,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0C447C",
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: "#0C447C",
    paddingVertical: 22,
    borderRadius: 12,
    alignItems: "center",
  },
  disabled: {
    backgroundColor: "#9AAAB8",
  },
  optionText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  signOutButton: {
    marginTop: "auto",
    marginBottom: 32,
    alignItems: "center",
    paddingVertical: 14,
  },
  signOutText: {
    color: "#A32D2D",
    fontSize: 16,
    fontWeight: "600",
  },
});
