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
  dayKey,
  lastDays,
  totalsForDay,
  useDiary,
  weightSeries,
} from "../lib/diary-store";
import { colors } from "../theme";
import { IconChevron } from "./Icons";
import { StatDetail, type DetailKind } from "./StatDetail";

export function StatsScreen({ bottomInset = 0 }: { bottomInset?: number }) {
  const entries = useDiary((s) => s.entries);
  const goal = useDiary((s) => s.calorieGoal);
  const weights = useDiary((s) => s.weights);
  const setGoal = useDiary((s) => s.setGoal);
  const [detail, setDetail] = React.useState<DetailKind | null>(null);

  const today = totalsForDay(entries);
  const remaining = Math.max(0, goal - today.calories);
  const week = lastDays(entries, 7);
  const weekCals = week.map((d) => d.totals.calories);
  const avgCals = Math.round(weekCals.reduce((a, b) => a + b, 0) / (weekCals.length || 1));
  const weightPts = weightSeries(weights);
  const latestWeight = weightPts.length ? weightPts[weightPts.length - 1].kg : null;

  // Hábitos: últimos 30 días.
  const days30 = buildDays(30, entries, weights);
  const loggedWeek = days30.slice(-7).filter((d) => d.food).length;
  const weighedWeek = days30.slice(-7).filter((d) => d.weight).length;

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Inicio</Text>
        <Text style={styles.sub}>Lo que registras desde el chat</Text>

        {/* Hero: anillo de calorías */}
        <Pressable style={styles.heroCard} onPress={editGoal}>
          <CalorieRing consumed={today.calories} goal={goal} />
          <Text style={styles.ringHint}>
            {today.calories <= goal
              ? `${remaining} kcal restantes`
              : `${today.calories - goal} kcal por encima`}
            {"   ·   "}objetivo {goal}
          </Text>
        </Pressable>

        {/* Análisis */}
        <Text style={styles.section}>Análisis</Text>
        <View style={styles.grid}>
          <Card
            title="Calorías"
            subtitle="Últimos 7 días"
            value={`${avgCals}`}
            unit="kcal/día"
            onPress={() => setDetail("calorias")}
          >
            <MiniBars values={weekCals} goal={goal} />
          </Card>
          <Card
            title="Peso"
            subtitle="Tendencia"
            value={latestWeight ? latestWeight.toFixed(1) : "—"}
            unit={latestWeight ? "kg" : ""}
            onPress={() => setDetail("peso")}
          >
            <MiniLine points={weightPts.map((p) => p.kg)} />
          </Card>
        </View>

        {/* Hábitos */}
        <Text style={styles.section}>Hábitos</Text>
        <View style={styles.grid}>
          <Card
            title="Registro"
            subtitle="Últimos 30 días"
            value={`${loggedWeek}/7`}
            unit="esta semana"
            onPress={() => setDetail("registro")}
          >
            <DotGrid active={days30.map((d) => d.food)} color={colors.accent} />
          </Card>
          <Card
            title="Pesajes"
            subtitle="Últimos 30 días"
            value={`${weighedWeek}/7`}
            unit="esta semana"
            onPress={() => setDetail("pesajes")}
          >
            <DotGrid active={days30.map((d) => d.weight)} color="#3b82f6" />
          </Card>
        </View>
      </ScrollView>

      <StatDetail kind={detail} onClose={() => setDetail(null)} />
    </SafeAreaView>
  );
}

function buildDays(
  n: number,
  entries: Record<string, { length: number }[] | unknown>,
  weights: Record<string, number>,
) {
  const out: { food: boolean; weight: boolean }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const list = (entries as Record<string, unknown[]>)[k];
    out.push({ food: Array.isArray(list) && list.length > 0, weight: weights[k] != null });
  }
  return out;
}

function Card({
  title,
  subtitle,
  value,
  unit,
  children,
  onPress,
}: {
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{subtitle}</Text>
      <View style={styles.cardVisual}>{children}</View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardValue}>
          {value}
          {unit ? <Text style={styles.cardUnit}> {unit}</Text> : null}
        </Text>
        <IconChevron size={16} color={colors.textFaint} />
      </View>
    </Pressable>
  );
}

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const size = 210;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
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

const CHART_W = 150;

function MiniBars({ values, goal }: { values: number[]; goal: number }) {
  const max = Math.max(goal, ...values, 1);
  return (
    <View style={styles.bars}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            marginHorizontal: 1.5,
            height: Math.max((v / max) * 42, 3),
            borderRadius: 3,
            backgroundColor: i === values.length - 1 ? colors.accent : colors.surfaceAlt,
          }}
        />
      ))}
    </View>
  );
}

function MiniLine({ points }: { points: number[] }) {
  if (points.length < 2) return <View style={{ height: 44 }} />;
  const h = 44;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * CHART_W;
      const y = h - ((p - min) / span) * (h - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <Svg width={CHART_W} height={h}>
      <Polyline points={coords} fill="none" stroke={colors.accent} strokeWidth={2.5} />
    </Svg>
  );
}

function DotGrid({ active, color }: { active: boolean[]; color: string }) {
  return (
    <View style={styles.dots}>
      {active.map((on, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: on ? color : colors.surfaceAlt }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { padding: 16, gap: 12 },
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: -6, marginBottom: 2 },
  section: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 6 },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 22,
    alignItems: "center",
  },
  ringValue: { color: colors.text, fontSize: 44, fontWeight: "700" },
  ringUnit: { color: colors.textMuted, fontSize: 14, marginTop: -2 },
  ringHint: { color: colors.textMuted, fontSize: 13, marginTop: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48.5%",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  cardSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  cardVisual: { height: 46, justifyContent: "center", marginVertical: 14 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardValue: { color: colors.text, fontSize: 20, fontWeight: "700" },
  cardUnit: { color: colors.textMuted, fontSize: 12, fontWeight: "400" },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 44 },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  dot: { width: 9, height: 9, borderRadius: 2.5 },
});
