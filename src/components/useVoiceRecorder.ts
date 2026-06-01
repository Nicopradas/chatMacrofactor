"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Maneja la grabación de voz: pide el micrófono, graba con MediaRecorder y, en
 * paralelo, expone un AnalyserNode para que la UI pueda dibujar las ondas en
 * tiempo real (estilo "escuchando" de ChatGPT). Al detener, transcribe el audio.
 */
export function useVoiceRecorder({
  onTranscribed,
}: {
  onTranscribed: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  // El analyser vive en estado para que el componente de ondas se vuelva a
  // renderizar (y arranque su bucle) en cuanto empieza la grabación.
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cancelledRef = useRef(false);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setBusy(true);
      try {
        const form = new FormData();
        const ext = blob.type.includes("webm") ? "webm" : "m4a";
        form.append("audio", blob, `audio.${ext}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json();
        if (data.text) onTranscribed(data.text as string);
        else alert(data.error ?? "Could not transcribe audio");
      } catch {
        alert("Error transcribing audio");
      } finally {
        setBusy(false);
      }
    },
    [onTranscribed],
  );

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Analyser para las ondas en vivo.
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.7;
      source.connect(node);
      audioCtxRef.current = ctx;
      setAnalyser(node);

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        setAnalyser(null);
        if (cancelledRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await transcribe(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert("Could not access the microphone. Check your permissions.");
    }
  }, [transcribe]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    setRecording(false);
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    recorderRef.current?.stop();
    setRecording(false);
  }, []);

  return { recording, busy, analyser, start, stop, cancel };
}
