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
      name: "mf-diary",
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

/** Serie de pesos ordenada por fecha (más antiguo → reciente). */
export function weightSeries(
  weights: Record<string, number>,
): { key: string; kg: number }[] {
  return Object.entries(weights)
    .map(([key, kg]) => ({ key, kg }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}
