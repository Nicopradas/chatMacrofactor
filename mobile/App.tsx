import "./polyfills";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "./src/auth";
import { colors } from "./src/theme";
import { ChatScreen } from "./src/components/ChatScreen";
import { StatsScreen } from "./src/components/StatsScreen";
import { TimelineScreen } from "./src/components/TimelineScreen";
import { LoginScreen } from "./src/components/LoginScreen";
import { TabBar, TAB_BAR_PILL_HEIGHT, type Tab } from "./src/components/TabBar";
import { seedDemoData } from "./src/lib/diary-store";

function Main() {
  const [tab, setTab] = useState<Tab>("chat");
  const [kbVisible, setKbVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, () => setKbVisible(true));
    const h = Keyboard.addListener(hideEvt, () => setKbVisible(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  // La píldora flota (liquid glass) sobre el contenido: las pantallas reservan
  // este hueco abajo para que su contenido no quede tapado.
  const tabBarHeight = TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, 14) + 16;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Mantenemos ambas pantallas montadas para no perder el estado del chat. */}
      <View style={{ flex: 1, display: tab === "chat" ? "flex" : "none" }}>
        <ChatScreen bottomInset={kbVisible ? 0 : tabBarHeight} />
      </View>
      <View style={{ flex: 1, display: tab === "diary" ? "flex" : "none" }}>
        <TimelineScreen bottomInset={tabBarHeight} />
      </View>
      <View style={{ flex: 1, display: tab === "home" ? "flex" : "none" }}>
        <StatsScreen bottomInset={tabBarHeight} />
      </View>
      {!kbVisible && (
        <View style={styles.tabBarWrap} pointerEvents="box-none">
          <TabBar active={tab} onChange={setTab} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
});

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
        <Main />
      )}
    </SafeAreaProvider>
  );
}
