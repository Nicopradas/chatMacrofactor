import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { IconChat, IconStats } from "./Icons";

export type Tab = "chat" | "stats";

const TABS: { key: Tab; label: string; Icon: typeof IconChat }[] = [
  { key: "chat", label: "Chat", Icon: IconChat },
  { key: "stats", label: "Resumen", Icon: IconStats },
];

export function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {TABS.map(({ key, label, Icon }) => {
        const on = active === key;
        const color = on ? colors.text : colors.textFaint;
        return (
          <Pressable key={key} style={styles.item} onPress={() => onChange(key)}>
            <Icon size={24} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontSize: 11, fontWeight: "500" },
});
