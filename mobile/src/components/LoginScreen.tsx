import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../auth";
import { colors } from "../theme";

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
        <Image source={require("../../assets/macrofactor.png")} style={styles.logo} />
        <Text style={styles.title}>Chat MacroFactor</Text>
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
  logo: { width: 64, height: 64, borderRadius: 16, marginBottom: 16 },
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
