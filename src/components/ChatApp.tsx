"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import { useCart } from "@/lib/cart-store";
import type { FoodItemInput } from "@/lib/types";
import { Composer } from "./Composer";
import { Cart } from "./Cart";

export function ChatApp() {
  const addItems = useCart((s) => s.addItems);
  const cartCount = useCart((s) => s.items.length);
  const [cartOpen, setCartOpen] = useState(false);

  const { messages, sendMessage, status, addToolResult, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "add_food_items") {
        const input = toolCall.input as { items: FoodItemInput[] };
        addItems(input.items ?? []);
        addToolResult({
          tool: "add_food_items",
          toolCallId: toolCall.toolCallId,
          output: { added: input.items?.length ?? 0 },
        });
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  function handleSend(text: string, images: FileUIPart[]) {
    sendMessage({ text: text || "(ver imágenes)", files: images });
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* Columna del chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h1 className="text-base font-semibold">🍽️ Chat MacroFactor</h1>
            <p className="text-xs text-neutral-400">
              Fotos + voz → calorías reales → tu diario
            </p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white lg:hidden"
          >
            🛒 Carrito
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        <MessageList messages={messages} busy={busy} />

        {error && (
          <p className="bg-red-50 px-4 py-2 text-center text-sm text-red-600 dark:bg-red-950/40">
            {error.message}
          </p>
        )}

        <Composer onSend={handleSend} busy={busy} />
      </div>

      {/* Carrito: panel fijo en desktop */}
      <aside className="hidden w-[360px] shrink-0 border-l border-neutral-200 dark:border-neutral-800 lg:block">
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
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.length === 0 && (
        <div className="mx-auto mt-10 max-w-md text-center text-sm text-neutral-400">
          <p className="mb-2 text-2xl">📸🥗</p>
          <p>
            Manda una o varias fotos de tu comida y explícame el contexto (por
            ejemplo: <em>“esto lo compartí entre 3”</em>). Lo estimo y lo añado al
            carrito para que lo registres en MacroFactor.
          </p>
        </div>
      )}
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {busy && (
        <div className="flex gap-1 px-2 text-neutral-400">
          <Dot /> <Dot /> <Dot />
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: UIMsg }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5 text-[15px] ${
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-white text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }
          if (part.type === "file" && part.mediaType?.startsWith("image/")) {
            // eslint-disable-next-line @next/next/no-img-element
            return (
              <img
                key={i}
                src={part.url}
                alt={part.filename ?? "imagen"}
                className="max-h-56 rounded-lg object-cover"
              />
            );
          }
          if (part.type === "tool-add_food_items") {
            const items = (part.input as { items?: FoodItemInput[] } | undefined)?.items;
            if (!items?.length) return null;
            return (
              <div
                key={i}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                ➕ Añadido al carrito: {items.map((it) => it.name).join(", ")}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:var(--d)]" />
  );
}
