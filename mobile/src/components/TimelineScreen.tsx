import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  entriesForDay,
  macroGoals,
  totalsForDay,
  useDiary,
  type DiaryEntry,
} from "../lib/diary-store";
import { mfIconEmoji } from "../lib/mf-icon-emoji";
import { colors } from "../theme";

const MACROS = [
  { key: "calories" as const, label: "Calorías", color: "#3b82f6", unit: "" },
  { key: "protein" as const, label: "Proteína", color: "#f97316", unit: "g" },
  { key: "fat" as const, label: "Grasa", color: "#fbbf24", unit: "g" },
  { key: "carbs" as const, label: "Carbos", color: "#22c55e", unit: "g" },
];

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TimelineScreen({ bottomInset = 0 }: { bottomInset?: number }) {
  const entries = useDiary((s) => s.entries);
  const goal = useDiary((s) => s.calorieGoal);

  const today = totalsForDay(entries);
  const items = entriesForDay(entries);
  const mg = macroGoals(goal);
  const goals = { calories: goal, protein: mg.protein, fat: mg.fat, carbs: mg.carbs };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Diario</Text>
        <Text style={styles.sub}>Hoy</Text>

        {/* Resumen de macros (barras) */}
        <View style={styles.summary}>
          {MACROS.map((m) => {
            const val = Math.round(today[m.key]);
            const max = goals[m.key] || 1;
            const pct = Math.min(val / max, 1);
            return (
              <View key={m.key} style={styles.macroRow}>
                <View style={styles.macroTop}>
                  <Text style={styles.macroLabel}>{m.label}</Text>
                  <Text style={styles.macroNums}>
                    {val}
                    <Text style={styles.macroGoal}>
                      {" / "}
                      {max}
                      {m.unit}
                    </Text>
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: m.color }]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Línea de tiempo */}
        {items.length === 0 ? (
          <Text style={styles.empty}>
            Aún no has registrado nada hoy. Cuéntale al chat lo que has comido.
          </Text>
        ) : (
          <View style={styles.timeline}>
            {items.map((it, i) => (
              <FoodRow key={i} entry={it} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FoodRow({ entry }: { entry: DiaryEntry }) {
  return (
    <View style={styles.row}>
      <Text style={styles.time}>{fmtTime(entry.ts)}</Text>
      <View style={styles.card}>
        <Text style={styles.icon}>{mfIconEmoji(entry.icon)}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={2}>
            {entry.name}
          </Text>
          <Text style={styles.macroLine}>
            {Math.round(entry.protein)}P · {Math.round(entry.fat)}F · {Math.round(entry.carbs)}C
            {entry.grams ? `  ·  ${Math.round(entry.grams)} g` : ""}
          </Text>
        </View>
        <View style={styles.kcalBox}>
          <Text style={styles.kcal}>{Math.round(entry.calories)}</Text>
          <Text style={styles.kcalUnit}>kcal</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { padding: 16, gap: 8 },
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: -4, marginBottom: 8 },
  summary: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 8,
  },
  macroRow: { gap: 6 },
  macroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  macroLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  macroNums: { color: colors.text, fontSize: 13, fontWeight: "600" },
  macroGoal: { color: colors.textMuted, fontWeight: "400" },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 30,
    paddingHorizontal: 24,
    fontSize: 14,
    lineHeight: 20,
  },
  timeline: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  time: { width: 44, color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] },
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
  },
  icon: { fontSize: 26 },
  cardBody: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 15, fontWeight: "600" },
  macroLine: { color: colors.textMuted, fontSize: 12 },
  kcalBox: { alignItems: "flex-end" },
  kcal: { color: colors.text, fontSize: 17, fontWeight: "700" },
  kcalUnit: { color: colors.textMuted, fontSize: 11 },
});
