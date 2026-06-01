"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCart } from "@/lib/cart-store";
import { mfIconEmoji } from "@/lib/mf-icon-emoji";
import { Composer } from "./Composer";
import { Cart } from "./Cart";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function ChatApp() {
  const cartCount = useCart((s) => s.items.length);
  const [cartOpen, setCartOpen] = useState(false);

  const { messages, sendMessage, status, addToolResult, setMessages } = useChat({
    // Render casi por cada palabra (smoothStream ya las pacea a ~19ms en el server).
    experimental_throttle: 16,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Inyecta el estado actual del carrito en cada petición para que Claude
      // pueda modificarlo o borrar items.
      prepareSendMessagesRequest: ({ messages, body }) => ({
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

  function handleSend(text: string, images: FileUIPart[]) {
    sendMessage({ text: text || "(ver imágenes)", files: images });
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white text-neutral-900 dark:bg-[#212121] dark:text-neutral-100">
      {/* Columna del chat */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-white/10">
          <Brand />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMessages([])}
              className="rounded-full px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
              title="Nuevo chat"
            >
              Nuevo
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative rounded-full bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900 lg:hidden"
            >
              Carrito
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <MessageList messages={messages} busy={busy} />

        <div className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Composer onSend={handleSend} busy={busy} />
          <p className="mt-1.5 text-center text-[11px] text-neutral-400">
            Claude puede equivocarse al estimar porciones. Revisa el carrito antes de
            registrar.
          </p>
        </div>
      </div>

      {/* Carrito: panel fijo en desktop */}
      <aside className="hidden w-[380px] shrink-0 border-l border-neutral-200 dark:border-white/10 lg:block">
        <Cart />
      </aside>

      {/* Carrito: hoja inferior en móvil */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 top-12 overflow-hidden rounded-t-2xl">
            <Cart onClose={() => setCartOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

type UIMsg = ReturnType<typeof useChat>["messages"][number];

function MessageList({ messages, busy }: { messages: UIMsg[]; busy: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto mt-[15vh] max-w-md text-center">
            <p className="mb-3 text-4xl">🍽️</p>
            <h2 className="text-lg font-semibold">¿Qué has comido?</h2>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Manda fotos de tu comida y explícame el contexto. Lo estimo, lo añado al
              carrito y lo registras en MacroFactor. También puedes pedirme que ajuste o
              quite alimentos del carrito.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {busy && (
              <div className="flex gap-1 text-neutral-400">
                <Dot /> <Dot /> <Dot />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: UIMsg }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="msg-in flex justify-end">
        <div className="max-w-[85%] space-y-2 rounded-3xl bg-neutral-100 px-5 py-2.5 text-[15px] dark:bg-[#2f2f2f]">
          {message.parts.map((part, i) => renderPart(part, i, true))}
        </div>
      </div>
    );
  }

  return (
    <div className="msg-in flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
        MF
      </div>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5 text-[15px] leading-relaxed">
        {message.parts.map((part, i) => renderPart(part, i, false))}
      </div>
    </div>
  );
}

function renderPart(part: any, i: number, isUser: boolean) {
  if (part.type === "text") {
    if (isUser) {
      return (
        <p key={i} className="whitespace-pre-wrap">
          {part.text}
        </p>
      );
    }
    return <Markdown key={i} text={part.text} />;
  }
  if (part.type === "file" && part.mediaType?.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={i}
        src={part.url}
        alt={part.filename ?? "imagen"}
        className="max-h-60 rounded-xl object-cover"
      />
    );
  }
  if (typeof part.type === "string" && part.type.startsWith("tool-") && !isUser) {
    const label = toolChipLabel(part);
    if (!label) return null;
    return (
      <div
        key={i}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      >
        {label}
      </div>
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

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          code: ({ children }) => (
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-[13px] dark:bg-white/10">
              {children}
            </code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2" title="MacroFactor + Claude">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/macrofactor.png" alt="MacroFactor" className="h-7 w-7 rounded-md" />
      <span className="text-neutral-400">+</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/claude.png" alt="Claude" className="h-7 w-7 rounded-md" />
      <span className="ml-1 hidden text-[15px] font-semibold sm:inline">
        MacroFactor <span className="text-neutral-400">+</span> Claude
      </span>
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-current" />;
}
