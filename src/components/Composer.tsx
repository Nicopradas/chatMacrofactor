"use client";

import { useState } from "react";
import type { FileUIPart } from "ai";
import { MicButton } from "./MicButton";

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
 * Redimensiona y recomprime una imagen en el navegador para que quepa bajo el
 * límite de 5 MB de la API (y sea más rápida). Las fotos del iPhone pesan mucho;
 * 1568px de lado largo es de sobra para reconocer comida.
 */
async function compressImage(
  file: File,
): Promise<{ url: string; name: string; mediaType: string }> {
  const original = await readAsDataURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(original);
  } catch {
    // Si el navegador no puede decodificarla, la mandamos tal cual.
    return { url: original, name: file.name, mediaType: file.type };
  }

  const MAX_DIM = 1568;
  const MAX_BYTES = 4_500_000; // margen bajo el límite de 5 MB
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
  if (!ctx) return { url: original, name: file.name, mediaType: file.type };
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let url = canvas.toDataURL("image/jpeg", quality);
  // Baja la calidad hasta entrar bajo el límite.
  while (base64Bytes(url) > MAX_BYTES && quality > 0.35) {
    quality -= 0.12;
    url = canvas.toDataURL("image/jpeg", quality);
  }

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return { url, name, mediaType: "image/jpeg" };
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

  const [compressing, setCompressing] = useState(false);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setCompressing(true);
    try {
      const next: typeof images = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        next.push(await compressImage(f));
      }
      setImages((prev) => [...prev, ...next]);
    } finally {
      setCompressing(false);
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
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
  }

  const canSend = !busy && !compressing && (text.trim() || images.length > 0);

  return (
    <div className="rounded-[26px] border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#2f2f2f]">
      {(compressing || images.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          {images.map((im, i) => (
            <div key={i} className="relative">
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
            <span className="text-xs text-neutral-400">Comprimiendo…</span>
          )}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder="Describe tu comida o adjunta fotos…"
        className="max-h-44 w-full resize-none bg-transparent px-5 pt-4 text-base leading-6 outline-none placeholder:text-neutral-400"
      />

      <div className="flex items-center justify-between px-2.5 pb-2.5">
        {/* <label> nativo: en iOS Safari disparar el input con .click() falla. */}
        <label
          title="Adjuntar fotos"
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
          <MicButton
            disabled={busy}
            onTranscribed={(t) => setText((prev) => (prev ? prev + " " + t : t))}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition enabled:hover:opacity-90 disabled:opacity-30 dark:bg-white dark:text-neutral-900"
            title="Enviar"
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
