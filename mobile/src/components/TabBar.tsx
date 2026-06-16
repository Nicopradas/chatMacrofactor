import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { colors } from "../theme";
import { IconChat, IconList, IconStats } from "./Icons";

export type Tab = "chat" | "home" | "diary";

/** Alto de la píldora flotante (sin contar el margen inferior / safe-area). */
export const TAB_BAR_PILL_HEIGHT = 64;

const HAS_GLASS = Platform.OS === "ios" && isLiquidGlassAvailable();

const TABS: { key: Tab; label: string; Icon: typeof IconChat }[] = [
  { key: "chat", label: "Chat", Icon: IconChat },
  { key: "diary", label: "Diario", Icon: IconList },
  { key: "home", label: "Inicio", Icon: IconStats },
];

export function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const insets = useSafeAreaInsets();
  const marginBottom = Math.max(insets.bottom, 14);

  const items = (
    <View style={styles.row}>
      {TABS.map(({ key, label, Icon }) => {
        const on = active === key;
        const color = on ? colors.text : colors.textFaint;
        return (
          <Pressable key={key} style={styles.item} onPress={() => onChange(key)}>
            <Icon size={23} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (HAS_GLASS) {
    return (
      <View style={[styles.floatWrap, { marginBottom }]}>
        <GlassView style={styles.pill} glassEffectStyle="regular" colorScheme="light">
          {items}
        </GlassView>
      </View>
    );
  }

  // Fallback (iOS < 26): cristal esmerilado con blur.
  return (
    <View style={[styles.floatWrap, { marginBottom }]}>
      <BlurView intensity={40} tint="light" style={[styles.pill, styles.pillFallback]}>
        {items}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  floatWrap: {
    marginHorizontal: 28,
    // Sombra suave para que "flote" sobre el contenido.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  pill: {
    height: TAB_BAR_PILL_HEIGHT,
    borderRadius: TAB_BAR_PILL_HEIGHT / 2,
    overflow: "hidden",
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
  },
  pillFallback: { backgroundColor: "rgba(255,255,255,0.6)" },
  row: { flexDirection: "row" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontSize: 11, fontWeight: "500" },
});
