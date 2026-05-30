"use client";

import { useState } from "react";
import { cartTotals, useCart } from "@/lib/cart-store";
import { cartToMacroFactorJson } from "@/lib/macrofactor-json";
import { mfIconEmoji } from "@/lib/mf-icon-emoji";
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

  function sendToMacroFactor() {
    if (items.length === 0) return;
    const json = JSON.stringify(cartToMacroFactorJson(items));
    const url = `shortcuts://run-shortcut?name=${encodeURIComponent(
      SHORTCUT_NAME,
    )}&input=text&text=${encodeURIComponent(json)}`;
    setMsg("Abriendo Atajos… confirma para registrar en MacroFactor.");
    window.location.href = url;
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#171717]">
      <div className="flex items-center justify-between px-4 py-3.5">
        <h2 className="text-base font-semibold">
          Carrito{" "}
          <span className="font-normal text-neutral-400">{items.length}</span>
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 lg:hidden dark:hover:bg-white/10"
          >
            Cerrar
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {items.length === 0 ? (
          <p className="mt-10 px-6 text-center text-sm text-neutral-400">
            Tu carrito está vacío. Manda fotos o describe tu comida y Claude irá
            añadiendo los alimentos aquí.
          </p>
        ) : (
          items.map((item) => (
            <CartRow
              key={item.id}
              item={item}
              onChange={(patch) => updateItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}
      </div>

      <div className="px-3 pb-4 pt-2">
        <div className="mb-3 flex items-baseline justify-between rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-white/[0.04]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold">{Math.round(totals.calories)}</span>
            <span className="text-sm text-neutral-400">kcal</span>
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            P {Math.round(totals.protein)} · C {Math.round(totals.carbs)} · G{" "}
            {Math.round(totals.fat)}
          </div>
        </div>

        {msg && (
          <p className="mb-2 whitespace-pre-wrap text-center text-sm text-neutral-500">
            {msg}
          </p>
        )}

        <button
          onClick={sendToMacroFactor}
          disabled={items.length === 0}
          className="w-full rounded-full bg-neutral-900 py-3 text-sm font-medium text-white transition enabled:hover:opacity-90 disabled:opacity-30 dark:bg-white dark:text-neutral-900"
        >
          Registrar en MacroFactor
        </button>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="mt-1.5 w-full rounded-full py-2.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5"
          >
            Vaciar
          </button>
        )}
      </div>
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
    <div className="rounded-2xl bg-neutral-50 p-3.5 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-2">
        <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
          {mfIconEmoji(item.icon)}
        </span>
        <input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full bg-transparent text-[15px] font-medium outline-none"
        />
        <button
          onClick={onRemove}
          className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-500 dark:hover:bg-white/10"
          title="Quitar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
      {item.note && (
        <p className="mt-0.5 text-xs text-neutral-400">
          {item.note}
          {item.confidence ? ` · confianza ${item.confidence}` : ""}
        </p>
      )}
      <div className="mt-2.5 grid grid-cols-5 gap-1">
        <Field label="g" value={num(item.grams)} onChange={(v) => onChange({ grams: Number(v) || 0 })} />
        <Field label="kcal" value={num(item.calories)} onChange={(v) => onChange({ calories: Number(v) || 0 })} />
        <Field label="P" value={num(item.protein)} onChange={(v) => onChange({ protein: Number(v) || 0 })} />
        <Field label="C" value={num(item.carbs)} onChange={(v) => onChange({ carbs: Number(v) || 0 })} />
        <Field label="G" value={num(item.fat)} onChange={(v) => onChange({ fat: Number(v) || 0 })} />
      </div>
    </div>
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
        className="w-full rounded-lg bg-white px-1 py-1.5 text-center text-[15px] font-medium outline-none ring-1 ring-transparent transition focus:ring-neutral-300 dark:bg-white/[0.06] dark:focus:ring-white/20"
      />
      <span className="mt-1 text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </span>
    </label>
  );
}
