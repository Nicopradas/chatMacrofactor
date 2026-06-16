import "./polyfills";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "./src/auth";
import { colors } from "./src/theme";
import { ChatScreen } from "./src/components/ChatScreen";
import { LoginScreen } from "./src/components/LoginScreen";

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
        <ChatScreen />
      )}
    </SafeAreaProvider>
  );
}
