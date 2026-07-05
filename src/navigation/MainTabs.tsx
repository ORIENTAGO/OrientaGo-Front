import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home as HomeIcon, Eye, Navigation as NavigationIcon } from "lucide-react-native";
import HomeScreen from "../screens/HomeScreen";
import AnalizarEntornoScreen from "../screens/AnalizarEntornoScreen";
import NavegacionAsistidaScreen from "../screens/NavegacionAsistidaScreen";
import { NavigationGuideProvider } from "../context/NavigationGuideContext";
import GuideStatusBar from "../components/GuideStatusBar";
import { colors } from "../theme/colors";

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Guide: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <NavigationGuideProvider>
      <View style={styles.flex}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.white,
            tabBarInactiveTintColor: "#B7C6D9",
            tabBarStyle: {
              backgroundColor: colors.primaryDark,
              borderTopWidth: 0,
              height: 64,
              paddingBottom: 10,
              paddingTop: 8,
            },
            tabBarLabelStyle: {
              fontFamily: "Inter_600SemiBold",
              fontSize: 12,
            },
            tabBarItemStyle: {
              borderRadius: 10,
              marginHorizontal: 6,
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: "Home",
              tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
              tabBarAccessibilityLabel: "Inicio",
            }}
          />
          <Tab.Screen
            name="Explore"
            component={AnalizarEntornoScreen}
            options={{
              tabBarLabel: "Explore",
              tabBarIcon: ({ color, size }) => <Eye color={color} size={size} />,
              tabBarAccessibilityLabel: "Analizar entorno",
            }}
          />
          <Tab.Screen
            name="Guide"
            component={NavegacionAsistidaScreen}
            options={{
              tabBarLabel: "Guide",
              tabBarIcon: ({ color, size }) => <NavigationIcon color={color} size={size} />,
              tabBarAccessibilityLabel: "Navegación asistida",
            }}
          />
        </Tab.Navigator>
        <GuideStatusBar />
      </View>
    </NavigationGuideProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
