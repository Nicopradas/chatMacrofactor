import { safeIcon } from "./mf-icons";
import type { CartItem } from "./types";

/**
 * Formato JSON oficial de MacroFactor para la acción de Atajos "Log by JSON".
 * Esquema: https://github.com/MacroFactor/apple-shortcuts
 *
 * - `nutrients.energy` en kcal; el resto de macros en gramos.
 * - `serving` puede ser "one" o una medida { amount, unit }.
 * - `icon` es OBLIGATORIO; usamos "foodDefault" como genérico.
 * - `source` identifica nuestro script por si hay que depurar.
 */
export interface MacroFactorFoodJson {
  source: string;
  icon: string;
  name: string;
  nutrients: Record<string, number>;
  // IMPORTANTE: "Log by JSON" multiplica los nutrientes por `serving.amount`.
  // Por eso usamos amount:1 (los nutrientes ya son el total de la porción) y
  // guardamos el peso real en `weight`. Una serving medida { amount: gramos }
  // multiplicaría las calorías por los gramos (bug: 70 kcal * 90 g = 6300).
  serving: "one" | { amount: number; label: string; weight: number };
  llmPrompt: string;
  notes?: string;
}

export const MF_SOURCE = "chat-macrofactor";

export function cartToMacroFactorJson(items: CartItem[]): MacroFactorFoodJson[] {
  return items.map((i) => {
    const grams = i.grams && i.grams > 0 ? Math.round(i.grams) : undefined;
    return {
      source: MF_SOURCE,
      icon: safeIcon(i.icon),
      name: i.name,
      nutrients: {
        energy: Math.round(i.calories || 0),
        protein: Math.round(i.protein || 0),
        carbs: Math.round(i.carbs || 0),
        fat: Math.round(i.fat || 0),
      },
      serving: grams
        ? { amount: 1, label: "serving", weight: grams }
        : "one",
      // El esquema recomienda prompt vacío cuando la estimación viene de una foto.
      llmPrompt: "",
      ...(i.note ? { notes: i.note } : {}),
    };
  });
}
