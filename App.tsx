import { useEffect } from "react";
import { ClerkProvider } from "@clerk/clerk-expo";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import AppNavigator from "./src/navigation/AppNavigator";
import { tokenCache } from "./src/config/tokenCache";
import { CLERK_PUBLISHABLE_KEY } from "./src/config/env";
import { colors } from "./src/theme/colors";
import { cargarPreferenciaDeVoz } from "./src/services/speechService";

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    cargarPreferenciaDeVoz();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }}>
        <ActivityIndicator color={colors.white} />
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <StatusBar style="auto" />
      <AppNavigator />
    </ClerkProvider>
  );
}
