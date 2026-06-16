import React, { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { authHeaders } from "../auth";
import { apiUrl } from "../config";
import { useCart } from "../lib/cart-store";
import { mfIconEmoji } from "../lib/mf-icon-emoji";
import { colors } from "../theme";
import { Composer, type ImagePart } from "./Composer";
import { CartSheet } from "./Cart";
import { ChatMarkdown } from "./Markdown";
import { Lightbox } from "./Lightbox";
import { LogoMark } from "./Icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function ChatScreen({ bottomInset = 0 }: { bottomInset?: number }) {
  const cartCount = useCart((s) => s.items.length);
  const [cartOpen, setCartOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const { messages, sendMessage, status, addToolResult, setMessages, error } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: apiUrl("/api/chat"),
      prepareSendMessagesRequest: ({ messages, body }) => ({
        headers: authHeaders(),
        body: { ...body, messages, cart: useCart.getState().items },
      }),
    }),
    onToolCall: ({ toolCall }) => {
      const tc = toolCall as { toolName: string; toolCallId: string; input: any };
      const cart = useCart.getState();
      let output: any = { ok: true };
      switch (tc.toolName) {
        case "add_food_items":
          cart.addItems(tc.input?.items ?? []);
          output = { added: tc.input?.items?.length ?? 0 };
          break;
        case "update_food_items":
          for (const it of tc.input?.items ?? []) {
            const { id, ...patch } = it;
            cart.updateItem(id, patch);
          }
          output = { updated: tc.input?.items?.length ?? 0 };
          break;
        case "remove_food_items":
          for (const id of tc.input?.ids ?? []) cart.removeItem(id);
          output = { removed: tc.input?.ids?.length ?? 0 };
          break;
        case "clear_cart":
          cart.clear();
          output = { cleared: true };
          break;
        default:
          return;
      }
      addToolResult({ tool: tc.toolName as any, toolCallId: tc.toolCallId, output });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  function handleSend(text: string, images: ImagePart[]) {
    sendMessage({ text: text || "(ver imágenes)", files: images as any });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <LogoMark size={26} color={colors.accent} />
        </View>
        <View style={styles.headerBtns}>
          <Pressable onPress={() => setMessages([])} style={styles.newBtn} hitSlop={6}>
            <Text style={styles.newBtnText}>Nuevo</Text>
          </Pressable>
          <Pressable onPress={() => setCartOpen(true)} style={styles.cartBtn} hitSlop={6}>
            <Text style={styles.cartBtnText}>Carrito</Text>
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
        >
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>¿Qué has comido?</Text>
              <Text style={styles.emptyText}>
                Manda fotos de tu comida y explícame el contexto. Lo estimo, lo añado al
                carrito y queda registrado en tu resumen.
              </Text>
            </View>
          ) : (
            messages.map((m) => (
              <MessageRow key={m.id} message={m} onImagePress={setLightbox} />
            ))
          )}
          {status === "submitted" && <TypingBubble />}
        </ScrollView>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              Algo falló al procesar tu mensaje. Inténtalo de nuevo.
            </Text>
          </View>
        )}

        <View style={[styles.composerWrap, { paddingBottom: bottomInset || 8 }]}>
          <Composer onSend={handleSend} busy={busy} />
          <Text style={styles.disclaimer}>
            Claude puede equivocarse al estimar porciones. Revisa el carrito.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <CartSheet visible={cartOpen} onClose={() => setCartOpen(false)} />
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </SafeAreaView>
  );
}

function MessageRow({
  message,
  onImagePress,
}: {
  message: any;
  onImagePress: (src: string) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          {message.parts.map((p: any, i: number) => renderPart(p, i, true, onImagePress))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.botRow}>
      <View style={styles.avatar}>
        <LogoMark size={16} color={colors.accent} />
      </View>
      <View style={styles.botContent}>
        {message.parts.map((p: any, i: number) => renderPart(p, i, false, onImagePress))}
      </View>
    </View>
  );
}

function renderPart(
  part: any,
  i: number,
  isUser: boolean,
  onImagePress: (src: string) => void,
) {
  if (part.type === "text" && part.text) {
    if (isUser) {
      return (
        <Text key={i} style={styles.userText}>
          {part.text}
        </Text>
      );
    }
    return <ChatMarkdown key={i} text={part.text} />;
  }
  if (part.type === "file" && part.mediaType?.startsWith("image/")) {
    return (
      <Pressable key={i} onPress={() => onImagePress(part.url)}>
        <Image source={{ uri: part.url }} style={styles.chatImage} />
      </Pressable>
    );
  }
  if (typeof part.type === "string" && part.type.startsWith("tool-") && !isUser) {
    const label = toolChipLabel(part);
    if (!label) return null;
    return (
      <View key={i} style={styles.chip}>
        <Text style={styles.chipText}>{label}</Text>
      </View>
    );
  }
  return null;
}

function toolChipLabel(part: any): string | null {
  const input = part.input ?? {};
  switch (part.type) {
    case "tool-add_food_items": {
      const names = (input.items ?? [])
        .map((it: any) => `${mfIconEmoji(it.icon)} ${it.name}`)
        .join("  ");
      return names ? `Añadido: ${names}` : null;
    }
    case "tool-update_food_items":
      return `✏️ Actualizado ${input.items?.length ?? ""} alimento(s)`;
    case "tool-remove_food_items":
      return `🗑️ Quitado ${input.ids?.length ?? ""} alimento(s)`;
    case "tool-clear_cart":
      return "🧹 Carrito vaciado";
    default:
      return null;
  }
}

function TypingBubble() {
  return (
    <View style={styles.botRow}>
      <View style={styles.avatar}>
        <LogoMark size={16} color={colors.accent} />
      </View>
      <View style={styles.typing}>
        <Text style={styles.typingText}>···</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 28, height: 28, borderRadius: 7 },
  brandText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  newBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  newBtnText: { color: colors.textMuted, fontSize: 14 },
  cartBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cartBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: "500" },
  badge: {
    position: "absolute",
    right: -4,
    top: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  messages: { padding: 16, gap: 20, flexGrow: 1 },
  empty: { marginTop: "30%", alignItems: "center", paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "600" },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  userRow: { alignItems: "flex-end" },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  userText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  botRow: { flexDirection: "row", gap: 10 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  botContent: { flex: 1, gap: 8 },
  chatImage: { width: 180, height: 180, borderRadius: 12, maxWidth: "100%" },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { color: colors.accent, fontSize: 12 },
  typing: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typingText: { color: colors.textMuted, fontSize: 18, letterSpacing: 2 },
  errorBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(248,113,113,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: { color: colors.danger, fontSize: 13 },
  composerWrap: { paddingHorizontal: 12, paddingBottom: 4 },
  disclaimer: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
});
