import "./polyfills";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import {
  createNativeBottomTabNavigator,
  type NativeBottomTabNavigationOptions,
} from "@react-navigation/bottom-tabs/unstable";
import { useAuth } from "./src/auth";
import { colors } from "./src/theme";
import { ChatScreen } from "./src/components/ChatScreen";
import { StatsScreen } from "./src/components/StatsScreen";
import { TimelineScreen } from "./src/components/TimelineScreen";
import { LoginScreen } from "./src/components/LoginScreen";
import { seedDemoData } from "./src/lib/diary-store";

const Tab = createNativeBottomTabNavigator();

/** Icono del sistema (SF Symbol en iOS). La barra nativa lo dibuja con el material del sistema. */
const tabIcon = (sfSymbol: string): NativeBottomTabNavigationOptions["tabBarIcon"] =>
  Platform.OS === "ios"
    ? ({ type: "sfSymbol", name: sfSymbol } as NativeBottomTabNavigationOptions["tabBarIcon"])
    : undefined;

// Las pantallas ya no reservan hueco para la antigua píldora flotante: la barra
// nativa gestiona su propio espacio.
const ChatTab = () => <ChatScreen bottomInset={0} />;
const DiaryTab = () => <TimelineScreen bottomInset={0} />;
const HomeTab = () => <StatsScreen bottomInset={0} />;

function Main() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // Tinte de la pestaña seleccionada, como en las apps nativas (Fotos usa el azul del sistema).
        tabBarActiveTintColor: colors.accent,
        // `systemDefault` deja que iOS aplique su apariencia por defecto:
        // Liquid Glass en iOS 26, barra estándar del sistema en versiones anteriores.
        tabBarBlurEffect: "systemDefault",
        // Igual que Fotos/Safari en iOS 26: la barra se minimiza al hacer scroll.
        tabBarMinimizeBehavior: "onScrollDown",
      }}
    >
      <Tab.Screen
        name="Chat"
        component={ChatTab}
        options={{ title: "Chat", tabBarIcon: tabIcon("message.fill") }}
      />
      <Tab.Screen
        name="Diario"
        component={DiaryTab}
        options={{ title: "Diario", tabBarIcon: tabIcon("fork.knife") }}
      />
      <Tab.Screen
        name="Inicio"
        component={HomeTab}
        options={{ title: "Inicio", tabBarIcon: tabIcon("chart.bar.fill") }}
      />
    </Tab.Navigator>
  );
}

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg },
};

export default function App() {
  const ready = useAuth((s) => s.ready);
  const needsLogin = useAuth((s) => s.needsLogin);
  const init = useAuth((s) => s.init);

  useEffect(() => {
    init();
    seedDemoData(); // datos de DEMO si el diario está vacío
  }, [init]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!ready ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : needsLogin ? (
        <LoginScreen />
      ) : (
        <NavigationContainer theme={navTheme}>
          <Main />
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
