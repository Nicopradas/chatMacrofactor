import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Polyline } from "react-native-svg";
import {
  lastDays,
  totalsForDay,
  useDiary,
  weightSeries,
} from "../lib/diary-store";
import { colors } from "../theme";

const MACRO_COLORS = { protein: "#60a5fa", carbs: "#fbbf24", fat: "#f472b6" };

export function StatsScreen() {
  const entries = useDiary((s) => s.entries);
  const goal = useDiary((s) => s.calorieGoal);
  const weights = useDiary((s) => s.weights);
  const setGoal = useDiary((s) => s.setGoal);
  const setWeight = useDiary((s) => s.setWeight);

  const today = totalsForDay(entries);
  const remaining = Math.max(0, goal - today.calories);
  const week = lastDays(entries, 7);
  const weightPts = weightSeries(weights);

  function editGoal() {
    Alert.prompt(
      "Objetivo de calorías",
      "Kcal al día",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Guardar",
          onPress: (v?: string) => {
            const n = Number((v ?? "").replace(",", "."));
            if (n > 0) setGoal(n);
          },
        },
      ],
      "plain-text",
      String(goal),
      "number-pad",
    );
  }

  function logWeight() {
    Alert.prompt(
      "Registrar peso",
      "Peso de hoy (kg)",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Guardar",
          onPress: (v?: string) => {
            const n = Number((v ?? "").replace(",", "."));
            if (n > 0) setWeight(n);
          },
        },
      ],
      "plain-text",
      weightPts.length ? String(weightPts[weightPts.length - 1].kg) : "",
      "decimal-pad",
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Resumen</Text>
        <Text style={styles.sub}>Lo que registras desde el chat</Text>

        {/* Anillo de calorías */}
        <Pressable style={styles.card} onPress={editGoal}>
          <CalorieRing consumed={today.calories} goal={goal} />
          <Text style={styles.ringHint}>
            {today.calories <= goal
              ? `${remaining} kcal restantes`
              : `${today.calories - goal} kcal por encima`}
            {"  ·  "}objetivo {goal}
          </Text>
        </Pressable>

        {/* Macros */}
        <View style={styles.macrosRow}>
          <MacroPill label="Proteína" grams={today.protein} color={MACRO_COLORS.protein} />
          <MacroPill label="Carbos" grams={today.carbs} color={MACRO_COLORS.carbs} />
          <MacroPill label="Grasa" grams={today.fat} color={MACRO_COLORS.fat} />
        </View>

        {/* Semana */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Últimos 7 días</Text>
          <WeekChart week={week} goal={goal} />
        </View>

        {/* Peso */}
        <View style={styles.card}>
          <View style={styles.weightHeader}>
            <Text style={styles.cardTitle}>Peso</Text>
            <Pressable onPress={logWeight} style={styles.weightBtn}>
              <Text style={styles.weightBtnText}>Registrar</Text>
            </Pressable>
          </View>
          <WeightCard points={weightPts} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const size = 220;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringValue}>{Math.round(consumed)}</Text>
      <Text style={styles.ringUnit}>kcal hoy</Text>
    </View>
  );
}

function MacroPill({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={styles.macroPill}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroValue}>{Math.round(grams)} g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function WeekChart({
  week,
  goal,
}: {
  week: { date: Date; totals: { calories: number } }[];
  goal: number;
}) {
  const max = Math.max(goal, ...week.map((d) => d.totals.calories), 1);
  const letters = ["D", "L", "M", "X", "J", "V", "S"];
  const todayKey = new Date().getDate();
  return (
    <View style={styles.week}>
      {week.map((d, i) => {
        const h = Math.round((d.totals.calories / max) * 90);
        const isToday = d.date.getDate() === todayKey;
        return (
          <View key={i} style={styles.weekCol}>
            <View style={styles.weekBarTrack}>
              <View
                style={[
                  styles.weekBar,
                  { height: Math.max(h, 3), backgroundColor: isToday ? colors.accent : colors.surface },
                ]}
              />
            </View>
            <Text style={[styles.weekLabel, isToday && { color: colors.text }]}>
              {letters[d.date.getDay()]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function WeightCard({ points }: { points: { key: string; kg: number }[] }) {
  if (points.length === 0) {
    return <Text style={styles.weightEmpty}>Aún no has registrado tu peso.</Text>;
  }
  const latest = points[points.length - 1].kg;
  const prev = points.length > 1 ? points[points.length - 2].kg : latest;
  const delta = latest - prev;
  const w = 220;
  const h = 56;
  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const span = max - min || 1;
  const coords = points
    .map((p, i) => {
      const x = points.length > 1 ? (i / (points.length - 1)) * w : w / 2;
      const y = h - ((p.kg - min) / span) * (h - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <View>
      <View style={styles.weightTop}>
        <Text style={styles.weightValue}>{latest.toFixed(1)} kg</Text>
        {points.length > 1 && (
          <Text style={[styles.weightDelta, { color: delta <= 0 ? colors.accent : colors.danger }]}>
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} kg
          </Text>
        )}
      </View>
      {points.length > 1 && (
        <Svg width={w} height={h} style={{ marginTop: 8 }}>
          <Polyline points={coords} fill="none" stroke={colors.accent} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: -6, marginBottom: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "600", alignSelf: "flex-start" },
  ringValue: { color: colors.text, fontSize: 46, fontWeight: "700" },
  ringUnit: { color: colors.textMuted, fontSize: 14, marginTop: -2 },
  ringHint: { color: colors.textMuted, fontSize: 13, marginTop: 14 },
  macrosRow: { flexDirection: "row", gap: 10 },
  macroPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  macroValue: { color: colors.text, fontSize: 17, fontWeight: "600" },
  macroLabel: { color: colors.textMuted, fontSize: 12 },
  week: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", marginTop: 14 },
  weekCol: { flex: 1, alignItems: "center", gap: 6 },
  weekBarTrack: { height: 90, justifyContent: "flex-end" },
  weekBar: { width: 22, borderRadius: 6 },
  weekLabel: { color: colors.textFaint, fontSize: 12 },
  weightHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch" },
  weightBtn: { backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  weightBtnText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  weightEmpty: { color: colors.textMuted, fontSize: 13, alignSelf: "flex-start", marginTop: 10 },
  weightTop: { flexDirection: "row", alignItems: "baseline", gap: 10, alignSelf: "stretch", marginTop: 10 },
  weightValue: { color: colors.text, fontSize: 24, fontWeight: "700" },
  weightDelta: { fontSize: 14, fontWeight: "500" },
});
