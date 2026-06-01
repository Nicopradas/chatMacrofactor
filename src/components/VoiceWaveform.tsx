"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 28;

/**
 * Dibuja una fila de barras que reaccionan al volumen real del micrófono.
 * Lee el AnalyserNode en un bucle de requestAnimationFrame y actualiza el
 * `scaleY` de cada barra por referencia, sin re-renderizar React en cada frame.
 */
export function VoiceWaveform({ analyser }: { analyser: AnalyserNode | null }) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    // Repartimos los bins de frecuencia entre las barras dejando las graves
    // (más enérgicas) hacia el centro para un look simétrico.
    const half = Math.ceil(BAR_COUNT / 2);
    let raf = 0;

    const render = () => {
      analyser.getByteFrequencyData(data);
      const usable = Math.floor(data.length * 0.7);
      for (let i = 0; i < BAR_COUNT; i++) {
        const distFromCenter = Math.abs(i - (BAR_COUNT - 1) / 2);
        const bin = Math.floor((distFromCenter / half) * usable);
        const v = (data[bin] ?? 0) / 255; // 0..1
        const scale = 0.14 + v * v * 1.6; // realza picos, suaviza el silencio
        const el = barsRef.current[i];
        if (el) el.style.transform = `scaleY(${Math.min(scale, 1)})`;
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <div className="flex h-8 flex-1 items-center justify-center gap-[3px]">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="h-7 w-[3px] origin-center rounded-full bg-neutral-800 transition-transform duration-100 ease-out dark:bg-neutral-100"
          style={{ transform: "scaleY(0.14)" }}
        />
      ))}
    </div>
  );
}
