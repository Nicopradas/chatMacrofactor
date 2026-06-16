import React, { useRef, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { cartTotals, useCart } from "../lib/cart-store";
import { cartToMacroFactorJson } from "../lib/macrofactor-json";
import { mfIconEmoji } from "../lib/mf-icon-emoji";
import type { CartItem } from "../lib/types";
import { MF_SHORTCUT_NAME } from "../config";
import { colors } from "../theme";

const num = (n: number | undefined) => (n == null ? "" : String(Math.round(n)));

export function CartSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const items = useCart((s) => s.items);
  const updateItem = useCart((s) => s.updateItem);
  const removeItem = useCart((s) => s.removeItem);
  const clear = useCart((s) => s.clear);
  const [msg, setMsg] = useState<string | null>(null);

  const totals = cartTotals(items);

  function sendToMacroFactor() {
    if (items.length === 0) return;
    const json = JSON.stringify(cartToMacroFactorJson(items));
    const url = `shortcuts://run-shortcut?name=${encodeURIComponent(
      MF_SHORTCUT_NAME,
    )}&input=text&text=${encodeURIComponent(json)}`;
    setMsg("Abriendo Atajos… confirma para registrar en MacroFactor.");
    Linking.openURL(url).catch(() =>
      setMsg("No se pudo abrir Atajos. ¿Tienes el atajo instalado?"),
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Carrito <Text style={styles.count}>{items.length}</Text>
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>Cerrar</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ padding: 12, gap: 8 }}>
          {items.length === 0 ? (
            <Text style={styles.empty}>
              Tu carrito está vacío. Manda fotos o describe tu comida y Claude irá
              añadiendo los alimentos aquí.
            </Text>
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
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.totals}>
            <View style={styles.totalsLeft}>
              <Text style={styles.kcal}>{Math.round(totals.calories)}</Text>
              <Text style={styles.kcalUnit}>kcal</Text>
            </View>
            <Text style={styles.macros}>
              {`P ${Math.round(totals.protein)} · C ${Math.round(
                totals.carbs,
              )} · G ${Math.round(totals.fat)}`}
            </Text>
          </View>

          {msg && <Text style={styles.msg}>{msg}</Text>}

          <Pressable
            onPress={sendToMacroFactor}
            disabled={items.length === 0}
            style={[styles.primary, items.length === 0 && styles.disabled]}
          >
            <Text style={styles.primaryText}>Registrar en MacroFactor</Text>
          </Pressable>
          {items.length > 0 && (
            <Pressable onPress={clear} style={styles.clear}>
              <Text style={styles.clearText}>Vaciar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
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
  const base = useRef<{
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  function onGramsFocus() {
    base.current = {
      grams: item.grams || 0,
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
    };
  }

  function onGramsChange(v: string) {
    const g = Number(v) || 0;
    const b = base.current;
    if (b && b.grams > 0 && g > 0) {
      const r = g / b.grams;
      onChange({
        grams: g,
        calories: Math.round(b.calories * r),
        protein: Math.round(b.protein * r),
        carbs: Math.round(b.carbs * r),
        fat: Math.round(b.fat * r),
      });
    } else {
      onChange({ grams: g });
    }
  }

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.icon}>{mfIconEmoji(item.icon)}</Text>
        <TextInput
          value={item.name}
          onChangeText={(t) => onChange({ name: t })}
          style={styles.name}
        />
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={styles.trash}>🗑️</Text>
        </Pressable>
      </View>
      {!!item.note && (
        <Text style={styles.note}>
          {item.note}
          {item.confidence ? ` · confianza ${item.confidence}` : ""}
        </Text>
      )}
      <View style={styles.fields}>
        <Field label="g" value={num(item.grams)} onChangeText={onGramsChange} onFocus={onGramsFocus} />
        <Field label="kcal" value={num(item.calories)} onChangeText={(v) => onChange({ calories: Number(v) || 0 })} />
        <Field label="P" value={num(item.protein)} onChangeText={(v) => onChange({ protein: Number(v) || 0 })} />
        <Field label="C" value={num(item.carbs)} onChangeText={(v) => onChange({ carbs: Number(v) || 0 })} />
        <Field label="G" value={num(item.fat)} onChangeText={(v) => onChange({ fat: Number(v) || 0 })} />
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  onFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onFocus?: () => void;
}) {
  return (
    <View style={styles.field}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        keyboardType="numeric"
        style={styles.fieldInput}
      />
      <Text style={styles.fieldLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cartBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: "600" },
  count: { color: colors.textMuted, fontWeight: "400" },
  close: { color: colors.textMuted, fontSize: 15 },
  list: { flex: 1 },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 24,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  totals: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  totalsLeft: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  kcal: { color: colors.text, fontSize: 24, fontWeight: "600" },
  kcalUnit: { color: colors.textMuted, fontSize: 13, marginBottom: 3 },
  macros: { color: colors.textMuted, fontSize: 14 },
  msg: { color: colors.textMuted, textAlign: "center", marginBottom: 8, fontSize: 13 },
  primary: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabled: { opacity: 0.3 },
  primaryText: { color: colors.bg, fontWeight: "600", fontSize: 15 },
  clear: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  clearText: { color: colors.textMuted, fontSize: 14 },
  // Row
  row: { backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 14 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: { fontSize: 16 },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "500", padding: 0 },
  trash: { fontSize: 15 },
  note: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  fields: { flexDirection: "row", gap: 6, marginTop: 10 },
  field: { flex: 1, alignItems: "center" },
  fieldInput: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingVertical: 8,
    textAlign: "center",
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    textTransform: "uppercase",
  },
});
