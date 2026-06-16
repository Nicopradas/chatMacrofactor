import "./polyfills";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "./src/auth";
import { colors } from "./src/theme";
import { ChatScreen } from "./src/components/ChatScreen";
import { StatsScreen } from "./src/components/StatsScreen";
import { LoginScreen } from "./src/components/LoginScreen";
import { TabBar, type Tab } from "./src/components/TabBar";

function Main() {
  const [tab, setTab] = useState<Tab>("chat");
  const [kbVisible, setKbVisible] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Mantenemos ambas pantallas montadas para no perder el estado del chat. */}
      <View style={{ flex: 1, display: tab === "chat" ? "flex" : "none" }}>
        <ChatScreen />
      </View>
      <View style={{ flex: 1, display: tab === "stats" ? "flex" : "none" }}>
        <StatsScreen />
      </View>
      {!kbVisible && <TabBar active={tab} onChange={setTab} />}
    </View>
  );
}

export default function App() {
  const ready = useAuth((s) => s.ready);
  const needsLogin = useAuth((s) => s.needsLogin);
  const init = useAuth((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
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
