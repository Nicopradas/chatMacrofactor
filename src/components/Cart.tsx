"use client";

import { useState } from "react";
import { cartTotals, useCart } from "@/lib/cart-store";
import { cartToMacroFactorJson } from "@/lib/macrofactor-json";
import type { CartItem } from "@/lib/types";

const num = (n: number | undefined) => (n == null ? "" : String(Math.round(n)));

export function Cart({ onClose }: { onClose?: () => void }) {
  const items = useCart((s) => s.items);
  const updateItem = useCart((s) => s.updateItem);
  const removeItem = useCart((s) => s.removeItem);
  const clear = useCart((s) => s.clear);
  const [msg, setMsg] = useState<string | null>(null);

  const totals = cartTotals(items);

  // Nombre EXACTO del atajo de Apple Shortcuts que llama a "Log by JSON".
  const SHORTCUT_NAME =
    process.env.NEXT_PUBLIC_MF_SHORTCUT_NAME || "Log Chat MacroFactor";

  // Envía los alimentos del carrito a MacroFactor vía el atajo "Log by JSON".
  function sendToMacroFactor() {
    if (items.length === 0) return;
    const json = JSON.stringify(cartToMacroFactorJson(items));
    const url = `shortcuts://run-shortcut?name=${encodeURIComponent(
      SHORTCUT_NAME,
    )}&input=text&text=${encodeURIComponent(json)}`;
    setMsg("📲 Abriendo Atajos… confirma para registrar en MacroFactor.");
    window.location.href = url;
  }

  async function copyJson() {
    const json = JSON.stringify(cartToMacroFactorJson(items), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setMsg("✅ JSON copiado (pégalo en la acción 'Log by JSON')");
    } catch {
      setMsg(json);
    }
  }

  return (
    <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-base font-semibold">
          🛒 Carrito de calorías{" "}
          <span className="text-neutral-400">({items.length})</span>
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-sm text-neutral-500 lg:hidden">
            Cerrar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-400">
            Aún no hay alimentos. Envía fotos o describe tu comida y Claude los irá
            añadiendo aquí.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                onChange={(patch) => updateItem(item.id, patch)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <div className="mb-3 grid grid-cols-4 gap-1 text-center text-xs">
          <Total label="kcal" value={Math.round(totals.calories)} accent />
          <Total label="P" value={Math.round(totals.protein)} />
          <Total label="C" value={Math.round(totals.carbs)} />
          <Total label="G" value={Math.round(totals.fat)} />
        </div>
        {msg && (
          <p className="mb-2 whitespace-pre-wrap text-center text-sm">{msg}</p>
        )}
        <button
          onClick={sendToMacroFactor}
          disabled={items.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          📲 Registrar en MacroFactor
        </button>
        <div className="mt-2 flex gap-2">
          <button
            onClick={copyJson}
            disabled={items.length === 0}
            className="flex-1 rounded-xl border border-neutral-300 py-2.5 text-sm text-neutral-600 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
          >
            Copiar JSON
          </button>
          {items.length > 0 && (
            <button
              onClick={clear}
              className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
            >
              Vaciar
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-neutral-400">
          Usa la acción oficial &quot;Log by JSON&quot; de MacroFactor (atajo de Atajos).
        </p>
      </div>
    </div>
  );
}

function Total({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg py-1.5 ${accent ? "bg-emerald-600 text-white" : "bg-neutral-200 dark:bg-neutral-800"}`}>
      <div className="text-sm font-bold leading-none">{value}</div>
      <div className="mt-0.5 opacity-70">{label}</div>
    </div>
  );
}

function CartRow({
  item,
  onChange,
  onRemove,
}: {
  item: CartItem;
  onChange: (patch: Partial<CartItem>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-2">
        <input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full bg-transparent text-base font-medium outline-none"
        />
        <button onClick={onRemove} className="shrink-0 text-neutral-400 hover:text-red-500" title="Quitar">
          🗑
        </button>
      </div>
      {item.note && (
        <p className="mt-1 text-xs text-neutral-400">
          {item.note}
          {item.confidence ? ` · confianza ${item.confidence}` : ""}
        </p>
      )}
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        <Field label="g" value={num(item.grams)} onChange={(v) => onChange({ grams: Number(v) || 0 })} />
        <Field label="kcal" value={num(item.calories)} onChange={(v) => onChange({ calories: Number(v) || 0 })} />
        <Field label="P" value={num(item.protein)} onChange={(v) => onChange({ protein: Number(v) || 0 })} />
        <Field label="C" value={num(item.carbs)} onChange={(v) => onChange({ carbs: Number(v) || 0 })} />
        <Field label="G" value={num(item.fat)} onChange={(v) => onChange({ fat: Number(v) || 0 })} />
      </div>
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col items-center">
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-1 py-1 text-center text-base outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
      />
      <span className="mt-0.5 text-[10px] text-neutral-400">{label}</span>
    </label>
  );
}
