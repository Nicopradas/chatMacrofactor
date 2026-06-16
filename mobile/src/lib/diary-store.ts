import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "./types";

export interface DiaryEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams?: number;
  icon?: string;
  ts: number;
}

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Clave de día local en formato YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyTotals(): DayTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function sumEntries(entries: DiaryEntry[] | undefined): DayTotals {
  return (entries ?? []).reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    emptyTotals(),
  );
}

interface DiaryState {
  entries: Record<string, DiaryEntry[]>;
  calorieGoal: number;
  weights: Record<string, number>;
  logItems: (items: CartItem[]) => void;
  setGoal: (g: number) => void;
  setWeight: (kg: number, date?: string) => void;
}

export const useDiary = create<DiaryState>()(
  persist(
    (set) => ({
      entries: {},
      calorieGoal: 2000,
      weights: {},
      logItems: (items) =>
        set((s) => {
          const k = dayKey();
          const ts = Date.now();
          const next = (items ?? []).map((i) => ({
            name: i.name,
            calories: Math.round(i.calories || 0),
            protein: Math.round(i.protein || 0),
            carbs: Math.round(i.carbs || 0),
            fat: Math.round(i.fat || 0),
            grams: i.grams ? Math.round(i.grams) : undefined,
            icon: i.icon,
            ts,
          }));
          return {
            entries: { ...s.entries, [k]: [...(s.entries[k] ?? []), ...next] },
          };
        }),
      setGoal: (g) => set({ calorieGoal: Math.max(0, Math.round(g)) }),
      setWeight: (kg, date) =>
        set((s) => ({ weights: { ...s.weights, [date ?? dayKey()]: kg } })),
    }),
    {
      name: "mf-diary-v2",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Totales de un día (por defecto hoy). */
export function totalsForDay(
  entries: Record<string, DiaryEntry[]>,
  date: Date = new Date(),
): DayTotals {
  return sumEntries(entries[dayKey(date)]);
}

/** Últimos `n` días (más antiguo → hoy) con sus totales. */
export function lastDays(
  entries: Record<string, DiaryEntry[]>,
  n: number,
): { date: Date; key: string; totals: DayTotals }[] {
  const out: { date: Date; key: string; totals: DayTotals }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    out.push({ date: d, key, totals: sumEntries(entries[key]) });
  }
  return out;
}

/**
 * Rellena el diario con datos de DEMO si está vacío (solo para visualizar el
 * diseño). En cuanto registres comida real, manda lo tuyo. Borra esta llamada
 * cuando tengas datos de verdad.
 */
export function seedDemoData() {
  const s = useDiary.getState();
  if (Object.keys(s.entries).length > 0 || Object.keys(s.weights).length > 0) {
    return;
  }
  const entries: Record<string, DiaryEntry[]> = {};

  // HOY: varias comidas individuales (para la línea de tiempo del Diario).
  const at = (h: number, m: number) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  entries[dayKey()] = [
    { name: "Tostadas con aguacate", icon: "avocado", calories: 320, protein: 9, carbs: 34, fat: 16, grams: 180, ts: at(8, 30) },
    { name: "Pollo con arroz", icon: "chickenGrilled", calories: 540, protein: 48, carbs: 55, fat: 12, grams: 360, ts: at(13, 45) },
    { name: "Yogur con frutos secos", icon: "yogurt", calories: 210, protein: 14, carbs: 18, fat: 9, grams: 200, ts: at(17, 20) },
    { name: "Salmón y ensalada", icon: "salmonFilet", calories: 270, protein: 24, carbs: 8, fat: 15, grams: 240, ts: at(20, 30) },
  ];

  // Días anteriores: total agregado (para gráficas e historial).
  const past = [2180, 1840, 2320, 1960, 2040, 1720];
  past.forEach((cal, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (past.length - i));
    entries[dayKey(d)] = [
      {
        name: "Total del día",
        icon: "foodDefault",
        calories: cal,
        protein: Math.round((cal * 0.3) / 4),
        carbs: Math.round((cal * 0.4) / 4),
        fat: Math.round((cal * 0.3) / 9),
        ts: d.getTime(),
      },
    ];
  });

  // Peso con tendencia ligera a la baja (un pesaje cada ~2 días).
  const kgs = [78.6, 78.4, 78.1, 77.9, 77.6, 77.5, 77.3, 77.1];
  const weights: Record<string, number> = {};
  kgs.forEach((kg, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (kgs.length - 1 - i) * 2);
    weights[dayKey(d)] = kg;
  });

  useDiary.setState({ entries, weights, calorieGoal: 2200 });
}

/** Entradas de un día ordenadas por hora (para la línea de tiempo). */
export function entriesForDay(
  entries: Record<string, DiaryEntry[]>,
  date: Date = new Date(),
): DiaryEntry[] {
  return [...(entries[dayKey(date)] ?? [])].sort((a, b) => a.ts - b.ts);
}

/** Objetivos de macros derivados del objetivo de calorías (30/40/30 P/C/G). */
export function macroGoals(calorieGoal: number) {
  return {
    protein: Math.round((calorieGoal * 0.3) / 4),
    carbs: Math.round((calorieGoal * 0.4) / 4),
    fat: Math.round((calorieGoal * 0.3) / 9),
  };
}

/** Serie de pesos ordenada por fecha (más antiguo → reciente). */
export function weightSeries(
  weights: Record<string, number>,
): { key: string; kg: number }[] {
  return Object.entries(weights)
    .map(([key, kg]) => ({ key, kg }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}
