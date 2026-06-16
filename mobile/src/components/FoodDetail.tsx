import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import {
  macroGoals,
  sumEntries,
  useDiary,
  type DiaryEntry,
} from "../lib/diary-store";
import { mfIconEmoji } from "../lib/mf-icon-emoji";
import { colors } from "../theme";
import { IconClose } from "./Icons";

type MacroKey = "protein" | "fat" | "carbs";

const MACROS: {
  key: MacroKey;
  label: string;
  color: string;
  tint: string;
  kcalPerG: number;
}[] = [
  { key: "protein", label: "Proteína", color: "#f97316", tint: "rgba(249,115,22,0.16)", kcalPerG: 4 },
  { key: "fat", label: "Grasa", color: "#f5b301", tint: "rgba(245,179,1,0.18)", kcalPerG: 9 },
  { key: "carbs", label: "Carbos", color: "#22c55e", tint: "rgba(34,197,94,0.16)", kcalPerG: 4 },
];

const CAL_COLOR = "#3b82f6";

export function FoodDetail({
  items,
  title,
  subtitle,
  onClose,
}: {
  items: DiaryEntry[] | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const goal = useDiary((s) => s.calorieGoal);
  const insets = useSafeAreaInsets();
  const list = items ?? [];
  const totals = sumEntries(list);
  const grams = list.reduce((a, e) => a + (e.grams || 0), 0);
  const isMulti = list.length > 1;

  const mg = macroGoals(goal);
  const targets = { calories: goal, protein: mg.protein, fat: mg.fat, carbs: mg.carbs };

  // Reparto calórico por macro (para los porcentajes de energía).
  const macroData = MACROS.map((m) => {
    const g = Math.round(totals[m.key]);
    return { ...m, grams: g, kcal: Math.round(totals[m.key] * m.kcalPerG) };
  });
  const macroSum = macroData.reduce((a, m) => a + m.kcal, 0) || 1;

  const single = list.length === 1 ? list[0] : null;
  const headerTitle = title ?? single?.name ?? "Detalle";
  const headerSub =
    subtitle ??
    (isMulti
      ? `${list.length} alimentos`
      : grams > 0
        ? `${Math.round(grams)} g`
        : "");

  const totalCals = Math.round(totals.calories);
  const pct = (val: number, max: number) => (max > 0 ? (val / max) * 100 : 0);

  return (
    <Modal
      visible={items !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <IconClose size={18} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {single?.icon ? `${mfIconEmoji(single.icon)}  ` : ""}
              {headerTitle}
            </Text>
            {headerSub ? <Text style={styles.subtitle}>{headerSub}</Text> : null}
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Resumen: calorías + macros con % de energía */}
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <View style={styles.calBlock}>
                <Text style={styles.calNum}>{totalCals}</Text>
                <Text style={styles.calLabel}>Calorías</Text>
              </View>
              <View style={styles.macrosWrap}>
                {macroData.map((m) => (
                  <View key={m.key} style={styles.macroBlock}>
                    <View style={[styles.badge, { backgroundColor: m.tint }]}>
                      <Text style={styles.badgeText}>
                        {Math.round((m.kcal / macroSum) * 100)}%
                      </Text>
                    </View>
                    <Text style={styles.macroGramsBig}>{m.grams}</Text>
                    <Text style={styles.macroLabelSm}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Impacto en tus objetivos diarios */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Impacto en tus objetivos</Text>
            <View style={styles.ringsRow}>
              <RingGauge
                percent={pct(totals.calories, targets.calories)}
                color={CAL_COLOR}
                label="Calorías"
              />
              {macroData.map((m) => (
                <RingGauge
                  key={m.key}
                  percent={pct(totals[m.key], targets[m.key])}
                  color={m.color}
                  label={m.label}
                />
              ))}
            </View>
            <Text style={styles.ringsHint}>
              Porcentaje de tu objetivo diario que aporta
              {isMulti ? " esta selección" : " este alimento"}.
            </Text>
          </View>

          {/* Desglose nutricional detallado */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Desglose</Text>
            <DetailRow
              first
              dotColor={CAL_COLOR}
              label="Energía"
              value={`${totalCals} kcal`}
              note={`${Math.round(totals.calories * 4.184)} kJ`}
            />
            {macroData.map((m) => (
              <DetailRow
                key={m.key}
                dotColor={m.color}
                label={m.label}
                value={`${m.grams} g`}
                note={`${m.kcal} kcal · ${Math.round((m.kcal / macroSum) * 100)}%`}
              />
            ))}
            {grams > 0 ? (
              <DetailRow
                dotColor={colors.textFaint}
                label="Peso total"
                value={`${Math.round(grams)} g`}
              />
            ) : null}
          </View>

          {/* Lista de alimentos incluidos (cuando es una selección) */}
          {isMulti && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Incluye</Text>
              {list.map((e, i) => (
                <View key={i} style={styles.includeRow}>
                  <Text style={styles.includeIcon}>{mfIconEmoji(e.icon)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.includeName} numberOfLines={1}>
                      {e.name}
                    </Text>
                    <Text style={styles.includeMacros}>
                      {Math.round(e.protein)}P · {Math.round(e.fat)}F ·{" "}
                      {Math.round(e.carbs)}C
                      {e.grams ? `  ·  ${Math.round(e.grams)} g` : ""}
                    </Text>
                  </View>
                  <Text style={styles.includeKcal}>{Math.round(e.calories)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function RingGauge({
  percent,
  color,
  label,
}: {
  percent: number;
  color: string;
  label: string;
}) {
  const size = 66;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(percent / 100, 1));
  return (
    <View style={styles.ring}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.surfaceAlt}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={styles.ringPct}>{Math.round(percent)}%</Text>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({
  dotColor,
  label,
  value,
  note,
  first,
}: {
  dotColor: string;
  label: string;
  value: string;
  note?: string;
  first?: boolean;
}) {
  return (
    <View style={[styles.detailRow, first && styles.detailRowFirst]}>
      <View style={[styles.detailDot, { backgroundColor: dotColor }]} />
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailRight}>
        <Text style={styles.detailValue}>{value}</Text>
        {note ? <Text style={styles.detailNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", lineHeight: 27 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 18 },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
  },
  // Resumen
  summaryRow: { flexDirection: "row", alignItems: "flex-end" },
  calBlock: { marginRight: 14 },
  calNum: { color: colors.text, fontSize: 40, fontWeight: "800", lineHeight: 42 },
  calLabel: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  macrosWrap: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroBlock: { alignItems: "center", flex: 1 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  macroGramsBig: { color: colors.text, fontSize: 20, fontWeight: "700" },
  macroLabelSm: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  // Anillos
  ringsRow: { flexDirection: "row", justifyContent: "space-between" },
  ring: { alignItems: "center", flex: 1 },
  ringPct: { color: colors.text, fontSize: 14, fontWeight: "700" },
  ringLabel: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  ringsHint: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 16,
    lineHeight: 17,
  },
  // Desglose
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  detailDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  detailLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" },
  detailRight: { alignItems: "flex-end" },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  detailNote: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  // Incluye
  includeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  includeIcon: { fontSize: 24 },
  includeName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  includeMacros: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  includeKcal: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
