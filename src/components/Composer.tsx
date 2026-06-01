"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FileUIPart } from "ai";
import { upload } from "@vercel/blob/client";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { VoiceWaveform } from "./VoiceWaveform";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Tamaño aprox. (en bytes) del payload base64 de un data URL. */
function base64Bytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  return Math.floor((dataUrl.length - i - 1) * 0.75);
}

/**
 * Redimensiona y recomprime una imagen en el navegador antes de subirla a Vercel
 * Blob (más rápida y menos almacenamiento). Las fotos del iPhone pesan mucho;
 * 1568px de lado largo es de sobra para reconocer comida.
 */
async function compressImage(
  file: File,
): Promise<{ blob: Blob; name: string; mediaType: string }> {
  const original = await readAsDataURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(original);
  } catch {
    // Si el navegador no puede decodificarla, la subimos tal cual.
    return { blob: file, name: file.name, mediaType: file.type };
  }

  const MAX_DIM = 1568;
  const MAX_BYTES = 1_500_000; // suficiente para reconocer comida; subidas ligeras
  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > MAX_DIM) {
    const scale = MAX_DIM / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, name: file.name, mediaType: file.type };
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let url = canvas.toDataURL("image/jpeg", quality);
  // Baja la calidad hasta entrar bajo el límite.
  while (base64Bytes(url) > MAX_BYTES && quality > 0.35) {
    quality -= 0.12;
    url = canvas.toDataURL("image/jpeg", quality);
  }

  const blob = await (await fetch(url)).blob();
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return { blob, name, mediaType: "image/jpeg" };
}

/** Altura máxima del campo antes de hacer scroll interno (~8–10 líneas en móvil). */
const TEXTAREA_MAX_PX = 220;

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  const h = Math.min(el.scrollHeight, TEXTAREA_MAX_PX);
  el.style.height = `${h}px`;
  el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_PX ? "auto" : "hidden";
}

export function Composer({
  onSend,
  busy,
}: {
  onSend: (text: string, images: FileUIPart[]) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<{ url: string; name: string; mediaType: string }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [compressing, setCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cuando el usuario pulsa la flecha mientras graba: paramos, transcribimos y
  // enviamos automáticamente. La flag dispara el envío en cuanto llega el texto.
  const pendingSendRef = useRef(false);
  const [autoSend, setAutoSend] = useState(false);

  const voice = useVoiceRecorder({
    onTranscribed: (t) => {
      setText((prev) => (prev ? prev + " " + t : t));
      if (pendingSendRef.current) {
        pendingSendRef.current = false;
        setAutoSend(true);
      }
    },
  });

  useLayoutEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [text, images.length, compressing]);

  // Una vez la transcripción está en el campo, enviamos (si venía de la flecha).
  useEffect(() => {
    if (!autoSend) return;
    setAutoSend(false);
    submit();
    // submit() está hoisted; depende solo de la flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setCompressing(true);
    setUploadError(null);
    try {
      const next: typeof images = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        const { blob, name, mediaType } = await compressImage(f);
        // Sube directamente a Vercel Blob; al chat solo viaja la URL resultante.
        const result = await upload(`chat/${name}`, blob, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        next.push({ url: result.url, name, mediaType });
      }
      setImages((prev) => [...prev, ...next]);
    } catch {
      setUploadError("Couldn't upload the image. Please try again.");
    } finally {
      setCompressing(false);
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Pegar (Ctrl/Cmd+V) una imagen del portapapeles: en escritorio (capturas) y
  // en móvil (al pegar una foto copiada) entra por aquí sin tocar "adjuntar".
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imgFiles = items
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => f !== null);
    if (imgFiles.length === 0) return; // texto normal: dejar pegar
    e.preventDefault();
    const dt = new DataTransfer();
    imgFiles.forEach((f) => dt.items.add(f));
    addFiles(dt.files);
  }

  function submit() {
    if (busy || compressing) return;
    if (!text.trim() && images.length === 0) return;
    const parts: FileUIPart[] = images.map((im) => ({
      type: "file",
      mediaType: im.mediaType,
      filename: im.name,
      url: im.url,
    }));
    onSend(text.trim(), parts);
    setText("");
    setImages([]);
    requestAnimationFrame(() => resizeTextarea(textareaRef.current));
  }

  const canSend = !busy && !compressing && (text.trim() || images.length > 0);

  if (voice.recording) {
    return (
      <div className="bar-in flex items-center gap-2 rounded-[26px] border border-neutral-200 bg-white px-2.5 py-2 shadow-sm dark:border-white/10 dark:bg-[#2f2f2f]">
        <button
          type="button"
          onClick={voice.cancel}
          title="Cancel"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <VoiceWaveform analyser={voice.analyser} />

        <RecordingTimer />

        <div className="flex shrink-0 items-center gap-1">
          {/* Stop: para y deja el texto transcrito en el campo. */}
          <button
            type="button"
            onClick={voice.stop}
            title="Stop and transcribe"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2.5" />
            </svg>
          </button>
          {/* Flecha: para, transcribe y envía automáticamente. */}
          <button
            type="button"
            onClick={() => {
              pendingSendRef.current = true;
              voice.stop();
            }}
            title="Stop and send"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bar-in rounded-[26px] border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#2f2f2f]">
      {(compressing || images.length > 0 || uploadError) && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          {images.map((im, i) => (
            <div key={i} className="thumb-in relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.name} className="h-16 w-16 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          {compressing && (
            <span className="text-xs text-neutral-400">Uploading…</span>
          )}
          {uploadError && !compressing && (
            <span className="text-xs text-red-500">{uploadError}</span>
          )}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const el = e.currentTarget;
          requestAnimationFrame(() => {
            if (el.scrollHeight > TEXTAREA_MAX_PX) el.scrollTop = el.scrollHeight;
          });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={handlePaste}
        rows={1}
        placeholder="Describe your meal or attach photos…"
        aria-label="Message"
        className="min-h-[2.75rem] w-full resize-none overflow-y-auto bg-transparent px-5 pt-4 pb-1 text-base leading-6 outline-none placeholder:text-neutral-400 [-webkit-overflow-scrolling:touch]"
        style={{ maxHeight: TEXTAREA_MAX_PX }}
      />

      <div className="flex items-center justify-between px-2.5 pb-2.5">
        {/* <label> nativo: en iOS Safari disparar el input con .click() falla. */}
        <label
          title="Attach photos"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={voice.start}
            disabled={busy || voice.busy}
            title="Speak (Whisper)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-white/10"
          >
            {voice.busy ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition enabled:hover:opacity-90 disabled:opacity-30 dark:bg-white dark:text-neutral-900"
            title="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Cronómetro mm:ss que cuenta desde que se monta (al empezar a grabar). */
function RecordingTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span className="shrink-0 tabular-nums text-sm text-neutral-500 dark:text-neutral-400">
      {mm}:{ss}
    </span>
  );
}
