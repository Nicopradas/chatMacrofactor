import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  entriesForDay,
  macroGoals,
  sumEntries,
  totalsForDay,
  useDiary,
  type DiaryEntry,
} from "../lib/diary-store";
import { mfIconEmoji } from "../lib/mf-icon-emoji";
import { colors } from "../theme";
import { FoodDetail } from "./FoodDetail";

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

  const [detailItems, setDetailItems] = React.useState<DiaryEntry[] | null>(null);
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function toggle(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function onRowPress(idx: number) {
    if (selectMode) toggle(idx);
    else setDetailItems([items[idx]]);
  }

  function onRowLongPress(idx: number) {
    if (!selectMode) {
      setSelectMode(true);
      setSelected(new Set([idx]));
    } else {
      toggle(idx);
    }
  }

  const selectedItems = items.filter((_, i) => selected.has(i));
  const selTotals = sumEntries(selectedItems);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Diario</Text>
            <Text style={styles.sub}>Hoy</Text>
          </View>
          {items.length > 0 && (
            <Pressable
              onPress={selectMode ? exitSelect : () => setSelectMode(true)}
              hitSlop={8}
            >
              <Text style={styles.selectToggle}>
                {selectMode ? "Cancelar" : "Seleccionar"}
              </Text>
            </Pressable>
          )}
        </View>

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
              <FoodRow
                key={i}
                entry={it}
                selectMode={selectMode}
                selected={selected.has(i)}
                onPress={() => onRowPress(i)}
                onLongPress={() => onRowLongPress(i)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {selectMode && (
        <View style={[styles.selBar, { bottom: bottomInset + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selCount}>
              {selected.size} {selected.size === 1 ? "alimento" : "alimentos"}
            </Text>
            <Text style={styles.selMacros}>
              {Math.round(selTotals.calories)} kcal · {Math.round(selTotals.protein)}P ·{" "}
              {Math.round(selTotals.fat)}F · {Math.round(selTotals.carbs)}C
            </Text>
          </View>
          <Pressable
            style={[styles.selBtn, selected.size === 0 && styles.selBtnDisabled]}
            disabled={selected.size === 0}
            onPress={() => setDetailItems(selectedItems)}
          >
            <Text style={styles.selBtnText}>Ver agregado</Text>
          </Pressable>
        </View>
      )}

      <FoodDetail items={detailItems} onClose={() => setDetailItems(null)} />
    </SafeAreaView>
  );
}

function FoodRow({
  entry,
  selectMode,
  selected,
  onPress,
  onLongPress,
}: {
  entry: DiaryEntry;
  selectMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
    >
      {selectMode ? (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      ) : (
        <Text style={styles.time}>{fmtTime(entry.ts)}</Text>
      )}
      <View style={[styles.card, selected && styles.cardSelected]}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { padding: 16, gap: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: -4, marginBottom: 8 },
  selectToggle: { color: colors.accent, fontSize: 15, fontWeight: "600", paddingTop: 8 },
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textFaint,
    marginRight: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: "700", lineHeight: 16 },
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
  },
  cardSelected: { borderWidth: 2, borderColor: colors.accent, padding: 12 },
  icon: { fontSize: 26 },
  cardBody: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 15, fontWeight: "600" },
  macroLine: { color: colors.textMuted, fontSize: 12 },
  kcalBox: { alignItems: "flex-end" },
  kcal: { color: colors.text, fontSize: 17, fontWeight: "700" },
  kcalUnit: { color: colors.textMuted, fontSize: 11 },
  selBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  selCount: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  selMacros: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  selBtn: {
    backgroundColor: colors.white,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  selBtnDisabled: { opacity: 0.4 },
  selBtnText: { color: colors.text, fontSize: 14, fontWeight: "700" },
});
