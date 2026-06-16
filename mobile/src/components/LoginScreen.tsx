import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../auth";
import { APP_NAME } from "../config";
import { colors } from "../theme";
import { LogoMark } from "./Icons";

export function LoginScreen() {
  const login = useAuth((s) => s.login);
  const error = useAuth((s) => s.error);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password || busy) return;
    setBusy(true);
    try {
      await login(password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.box}>
        <View style={styles.logo}>
          <LogoMark size={40} color={colors.accent} />
        </View>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>Introduce la contraseña de la app</Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          autoFocus
          onSubmitEditing={submit}
          style={styles.input}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={!password || busy}
          style={[styles.button, (!password || busy) && styles.buttonDisabled]}
        >
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  box: { width: "100%", maxWidth: 360, alignItems: "center" },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: 24 },
  input: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  error: { color: colors.danger, marginTop: 12, fontSize: 14 },
  button: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.bg, fontWeight: "600", fontSize: 16 },
});
