import { ClerkProvider } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CLERK_PUBLISHABLE_KEY } from "../src/data/config/env";
import { tokenCache } from "../src/data/config/tokenCache";

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="home" />
        <Stack.Screen name="walk" />
      </Stack>
      <StatusBar style="auto" />
    </ClerkProvider>
  );
}
