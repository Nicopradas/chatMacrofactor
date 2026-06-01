"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCart } from "@/lib/cart-store";
import { mfIconEmoji } from "@/lib/mf-icon-emoji";
import { Composer } from "./Composer";
import { Cart } from "./Cart";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Abre una imagen a pantalla completa. Lo proveen ChatApp y consume cada <img>. */
const LightboxContext = createContext<(src: string, alt?: string) => void>(() => {});

export function ChatApp() {
  const cartCount = useCart((s) => s.items.length);
  const [cartOpen, setCartOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const {
    messages,
    sendMessage,
    status,
    addToolResult,
    setMessages,
    error,
    clearError,
    regenerate,
  } = useChat({
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
    sendMessage({ text: text || "(see images)", files: images });
  }

  return (
    <LightboxContext.Provider value={(src, alt) => setLightbox({ src, alt: alt ?? "image" })}>
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white text-neutral-900 dark:bg-[#212121] dark:text-neutral-100">
      {/* Columna del chat */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-white/10">
          <Brand />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMessages([])}
              className="rounded-full px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
              title="New chat"
            >
              New
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative rounded-full bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900 lg:hidden"
            >
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <MessageList messages={messages} thinking={status === "submitted"} />

        <div className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && (
            <ErrorBanner
              error={error}
              onDismiss={clearError}
              onRetry={() => {
                clearError();
                regenerate();
              }}
            />
          )}
          <Composer onSend={handleSend} busy={busy} />
          <p className="mt-1.5 text-center text-[11px] text-neutral-400">
            Claude may misestimate portions. Review the cart before logging.
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

      {lightbox && (
        <Lightbox {...lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
    </LightboxContext.Provider>
  );
}

/** Visor a pantalla completa: clic fuera o Escape para cerrar. */
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="lb-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        title="Close"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="lb-pop max-h-full max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

/** Traduce el error técnico a un mensaje útil para el usuario. */
function friendlyError(error: Error): string {
  const msg = (error.message || "").toLowerCase();
  if (
    msg.includes("413") ||
    msg.includes("payload too large") ||
    msg.includes("request entity too large") ||
    msg.includes("body size")
  ) {
    return "The message is too large, usually from attaching too many photos at once. Try sending fewer images per message.";
  }
  if (msg.includes("timeout") || msg.includes("504") || msg.includes("aborted")) {
    return "The response took too long and was cut off. Please try again, maybe with fewer photos.";
  }
  if (msg.includes("429") || msg.includes("rate limit")) {
    return "Too many requests in a row. Wait a few seconds and retry.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Couldn't reach the server. Check your connection and retry.";
  }
  return "Something went wrong processing your message. Please try again.";
}

/** Banner de error sobre el composer, con descartar y reintentar. */
function ErrorBanner({
  error,
  onDismiss,
  onRetry,
}: {
  error: Error;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="bar-in mb-2 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
      <svg
        className="mt-0.5 h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="min-w-0 flex-1 leading-snug">{friendlyError(error)}</p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full px-2.5 py-1 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-500/20"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onDismiss}
          title="Dismiss"
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-500/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

type UIMsg = ReturnType<typeof useChat>["messages"][number];

function MessageList({ messages, thinking }: { messages: UIMsg[]; thinking: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto mt-[15vh] max-w-md text-center">
            <p className="mb-3 text-4xl">🍽️</p>
            <h2 className="text-lg font-semibold">What did you eat?</h2>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Send food photos and explain the context. I&apos;ll estimate, add items to
              the cart, and you log them in MacroFactor. You can also ask me to adjust or
              remove foods from the cart.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {thinking && <TypingBubble />}
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
    return <ChatImage key={i} src={part.url} alt={part.filename ?? "image"} />;
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

/** Miniatura del chat: clic para abrirla en el lightbox. */
function ChatImage({ src, alt }: { src: string; alt: string }) {
  const openLightbox = useContext(LightboxContext);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onClick={() => openLightbox(src, alt)}
      className="max-h-60 cursor-zoom-in rounded-xl object-cover transition hover:opacity-90"
    />
  );
}

function toolChipLabel(part: any): string | null {
  const input = part.input ?? {};
  switch (part.type) {
    case "tool-add_food_items": {
      const names = (input.items ?? [])
        .map((it: any) => `${mfIconEmoji(it.icon)} ${it.name}`)
        .join("  ");
      return names ? `Added: ${names}` : null;
    }
    case "tool-update_food_items":
      return `✏️ Updated ${input.items?.length ?? ""} item(s)`;
    case "tool-remove_food_items":
      return `🗑️ Removed ${input.ids?.length ?? ""} item(s)`;
    case "tool-clear_cart":
      return "🧹 Cart cleared";
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

/** Burbuja de "escribiendo" del asistente, con la misma forma que sus mensajes. */
function TypingBubble() {
  return (
    <div className="msg-in flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
        MF
      </div>
      <div className="flex items-center gap-1 rounded-2xl bg-neutral-100 px-3.5 py-3 dark:bg-[#2f2f2f]">
        <Dot delay={0} />
        <Dot delay={0.15} />
        <Dot delay={0.3} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="typing-dot inline-block h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-500"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
