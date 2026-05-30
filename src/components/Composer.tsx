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

  return (
    <div className="border-t border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      {compressing && (
        <p className="mb-2 text-center text-xs text-neutral-400">Comprimiendo imagen…</p>
      )}
      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {images.map((im, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.name} className="h-16 w-16 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* En iOS Safari, disparar un input file oculto con JS (.click()) falla.
            Un <label> nativo abre el selector sin necesidad de JS. */}
        <label
          title="Adjuntar fotos"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </label>

        <MicButton
          disabled={busy}
          onTranscribed={(t) => setText((prev) => (prev ? prev + " " + t : t))}
        />

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
          placeholder="Tu comida o foto…"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-base leading-6 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800"
        />

        <button
          type="button"
          onClick={submit}
          disabled={busy || compressing || (!text.trim() && images.length === 0)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40"
          title="Enviar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
