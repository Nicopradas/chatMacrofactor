import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Line,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import {
  dayKey,
  lastDays,
  useDiary,
  weightSeries,
} from "../lib/diary-store";
import { colors } from "../theme";
import { IconClose } from "./Icons";

export type DetailKind = "calorias" | "peso" | "registro" | "pesajes";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/** Índice de día con la semana empezando en lunes (0 = lunes). */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

const TITLES: Record<DetailKind, string> = {
  calorias: "Calorías",
  peso: "Peso",
  registro: "Registro",
  pesajes: "Pesajes",
};

const SUBTITLES: Record<DetailKind, string> = {
  calorias: "Tu ingesta diaria",
  peso: "Tu evolución",
  registro: "Constancia al registrar comida",
  pesajes: "Constancia al pesarte",
};

export function StatDetail({
  kind,
  onClose,
}: {
  kind: DetailKind | null;
  onClose: () => void;
}) {
  const entries = useDiary((s) => s.entries);
  const goal = useDiary((s) => s.calorieGoal);
  const weights = useDiary((s) => s.weights);
  const setGoal = useDiary((s) => s.setGoal);
  const setWeight = useDiary((s) => s.setWeight);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Ancho útil del gráfico: ancho de pantalla menos padding del scroll y la tarjeta.
  const chartW = Math.max(width - 16 * 2 - 16 * 2, 200);

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
    const pts = weightSeries(weights);
    const latest = pts.length ? pts[pts.length - 1].kg : null;
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
      latest ? String(latest) : "",
      "decimal-pad",
    );
  }

  return (
    <Modal
      visible={kind !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{kind ? TITLES[kind] : ""}</Text>
            <Text style={styles.subtitle}>{kind ? SUBTITLES[kind] : ""}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <IconClose size={18} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {kind === "calorias" && (
            <CaloriesDetail
              entries={entries}
              goal={goal}
              chartW={chartW}
              onEditGoal={editGoal}
            />
          )}
          {kind === "peso" && (
            <WeightDetail
              weights={weights}
              chartW={chartW}
              onLogWeight={logWeight}
            />
          )}
          {kind === "registro" && (
            <HabitDetail entries={entries} weights={weights} kind="registro" />
          )}
          {kind === "pesajes" && (
            <HabitDetail entries={entries} weights={weights} kind="pesajes" />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ------------------------------- Calorías -------------------------------- */

function CaloriesDetail({
  entries,
  goal,
  chartW,
  onEditGoal,
}: {
  entries: Record<string, import("../lib/diary-store").DiaryEntry[]>;
  goal: number;
  chartW: number;
  onEditGoal: () => void;
}) {
  const days14 = lastDays(entries, 14);
  const logged30 = lastDays(entries, 30)
    .map((d) => d.totals.calories)
    .filter((v) => v > 0);
  const logged7 = days14
    .slice(-7)
    .map((d) => d.totals.calories)
    .filter((v) => v > 0);
  const avg7 = Math.round(mean(logged7));
  const avg30 = Math.round(mean(logged30));
  const maxDay = Math.round(Math.max(0, ...logged30));
  const overGoal = logged30.filter((v) => v > goal).length;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Últimos 14 días</Text>
        <BigBars days={days14} goal={goal} />
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>Hoy</Text>
          <View style={[styles.legendLine, { borderColor: colors.danger }]} />
          <Text style={styles.legendText}>Objetivo {goal} kcal</Text>
        </View>
      </View>

      <StatChips
        items={[
          { value: avg7 ? `${avg7}` : "—", label: "Media 7 días" },
          { value: avg30 ? `${avg30}` : "—", label: "Media 30 días" },
          { value: maxDay ? `${maxDay}` : "—", label: "Día más alto" },
          { value: `${overGoal}`, label: "Días sobre objetivo" },
        ]}
      />

      <Pressable style={styles.actionBtn} onPress={onEditGoal}>
        <Text style={styles.actionText}>Editar objetivo de calorías</Text>
      </Pressable>
    </>
  );
}

function BigBars({
  days,
  goal,
}: {
  days: { date: Date; totals: { calories: number } }[];
  goal: number;
}) {
  const vals = days.map((d) => d.totals.calories);
  const max = Math.max(goal, ...vals, 1) * 1.12;
  const H = 190;
  return (
    <View>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: (goal / max) * H,
            borderTopWidth: 1.5,
            borderColor: colors.danger,
            borderStyle: "dashed",
          }}
        />
        {days.map((d, i) => {
          const v = d.totals.calories;
          const isToday = i === days.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", marginHorizontal: 2 }}>
              <View
                style={{
                  width: "100%",
                  height: Math.max((v / max) * H, 3),
                  borderRadius: 5,
                  backgroundColor: isToday ? colors.accent : colors.surfaceAlt,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {days.map((d, i) => (
          <Text key={i} style={styles.axisLabel}>
            {i % 2 === days.length % 2 ? WEEKDAYS[mondayIndex(d.date)] : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* --------------------------------- Peso ---------------------------------- */

function WeightDetail({
  weights,
  chartW,
  onLogWeight,
}: {
  weights: Record<string, number>;
  chartW: number;
  onLogWeight: () => void;
}) {
  const pts = weightSeries(weights);
  const kgs = pts.map((p) => p.kg);
  const latest = kgs.length ? kgs[kgs.length - 1] : null;
  const first = kgs.length ? kgs[0] : null;
  const min = kgs.length ? Math.min(...kgs) : null;
  const max = kgs.length ? Math.max(...kgs) : null;
  const totalChange = latest != null && first != null ? latest - first : null;

  // Cambio en los últimos 7 días: punto más antiguo dentro de la ventana.
  const cutoff = dayKey(new Date(Date.now() - 7 * 86400000));
  const recent = pts.filter((p) => p.key >= cutoff);
  const change7 =
    latest != null && recent.length ? latest - recent[0].kg : null;

  const fmt = (n: number | null, suffix = "") =>
    n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}${suffix}`;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Evolución del peso</Text>
        <BigLine pts={pts} width={chartW} />
      </View>

      <StatChips
        items={[
          { value: latest != null ? `${latest.toFixed(1)}` : "—", label: "Actual (kg)" },
          { value: fmt(change7), label: "Cambio 7 días" },
          { value: fmt(totalChange), label: "Cambio total" },
          {
            value:
              min != null && max != null ? `${min.toFixed(1)}–${max.toFixed(1)}` : "—",
            label: "Mín–Máx (kg)",
          },
        ]}
      />

      <Pressable style={styles.actionBtn} onPress={onLogWeight}>
        <Text style={styles.actionText}>Registrar peso de hoy</Text>
      </Pressable>
    </>
  );
}

function BigLine({
  pts,
  width,
}: {
  pts: { key: string; kg: number }[];
  width: number;
}) {
  const H = 200;
  const padY = 24;
  const padX = 6;
  if (pts.length < 2) {
    return (
      <View style={{ height: H, justifyContent: "center", alignItems: "center" }}>
        <Text style={styles.empty}>
          Registra al menos dos pesajes para ver la gráfica.
        </Text>
      </View>
    );
  }
  const kgs = pts.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const span = max - min || 1;
  const x = (i: number) => padX + (i / (pts.length - 1)) * (width - padX * 2);
  const y = (kg: number) => padY + (1 - (kg - min) / span) * (H - padY * 2);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");

  return (
    <Svg width={width} height={H}>
      {[max, (max + min) / 2, min].map((v, i) => {
        const gy = padY + (i / 2) * (H - padY * 2);
        return (
          <React.Fragment key={i}>
            <Line
              x1={padX}
              y1={gy}
              x2={width - padX}
              y2={gy}
              stroke={colors.surfaceAlt}
              strokeWidth={1}
            />
            <SvgText x={padX} y={gy - 4} fontSize={10} fill={colors.textFaint}>
              {v.toFixed(1)}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Polyline points={line} fill="none" stroke={colors.accent} strokeWidth={2.5} />
      {pts.map((p, i) => (
        <Circle
          key={i}
          cx={x(i)}
          cy={y(p.kg)}
          r={i === pts.length - 1 ? 4.5 : 3}
          fill={i === pts.length - 1 ? colors.accent : colors.white}
          stroke={colors.accent}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}

/* ----------------------------- Hábitos ----------------------------------- */

function HabitDetail({
  entries,
  weights,
  kind,
}: {
  entries: Record<string, import("../lib/diary-store").DiaryEntry[]>;
  weights: Record<string, number>;
  kind: "registro" | "pesajes";
}) {
  const color = kind === "registro" ? colors.accent : "#3b82f6";
  const days = buildDays(30, entries, weights).map((d) => ({
    date: d.date,
    active: kind === "registro" ? d.food : d.weight,
  }));
  const logged = days.filter((d) => d.active).length;
  const pct = Math.round((logged / days.length) * 100);

  // Racha actual: días consecutivos activos terminando hoy.
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].active) streak++;
    else break;
  }
  // Mejor racha en los 30 días.
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d.active ? run + 1 : 0;
    if (run > best) best = run;
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Últimos 30 días</Text>
        <CalendarGrid days={days} color={color} />
      </View>

      <StatChips
        items={[
          { value: `${logged}/30`, label: "Días activos" },
          { value: `${pct}%`, label: "Cumplimiento" },
          { value: `${streak}`, label: "Racha actual" },
          { value: `${best}`, label: "Mejor racha" },
        ]}
      />

      <Text style={styles.hint}>
        {kind === "registro"
          ? "Cuéntale al chat lo que comes para sumar días."
          : "Registra tu peso a diario desde aquí para no perder la racha."}
      </Text>
    </>
  );
}

function CalendarGrid({
  days,
  color,
}: {
  days: { date: Date; active: boolean }[];
  color: string;
}) {
  const lead = days.length ? mondayIndex(days[0].date) : 0;
  const cells: ({ date: Date; active: boolean } | null)[] = [
    ...Array(lead).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekHeaderText}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((c, i) => {
          if (!c) return <View key={i} style={styles.calCell} />;
          return (
            <View key={i} style={styles.calCell}>
              <View
                style={[
                  styles.calDay,
                  { backgroundColor: c.active ? color : colors.surfaceAlt },
                ]}
              >
                <Text
                  style={[
                    styles.calDayText,
                    { color: c.active ? colors.white : colors.textFaint },
                  ]}
                >
                  {c.date.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function buildDays(
  n: number,
  entries: Record<string, import("../lib/diary-store").DiaryEntry[]>,
  weights: Record<string, number>,
) {
  const out: { date: Date; food: boolean; weight: boolean }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const list = entries[k];
    out.push({
      date: d,
      food: Array.isArray(list) && list.length > 0,
      weight: weights[k] != null,
    });
  }
  return out;
}

/* ------------------------------- Compartido ------------------------------ */

function StatChips({ items }: { items: { value: string; label: string }[] }) {
  return (
    <View style={styles.chips}>
      {items.map((it, i) => (
        <View key={i} style={styles.chip}>
          <Text style={styles.chipValue}>{it.value}</Text>
          <Text style={styles.chipLabel}>{it.label}</Text>
        </View>
      ))}
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 16 },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 14,
  },
  axisLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    color: colors.textFaint,
  },
  legend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLine: {
    width: 16,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    marginLeft: 8,
  },
  legendText: { color: colors.textMuted, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
  },
  chipValue: { color: colors.text, fontSize: 22, fontWeight: "700" },
  chipLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 2,
  },
  actionText: { color: colors.onPrimary, fontSize: 15, fontWeight: "600" },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  weekHeader: { flexDirection: "row", marginBottom: 8 },
  weekHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: colors.textFaint,
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  calDay: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayText: { fontSize: 13, fontWeight: "600" },
});
