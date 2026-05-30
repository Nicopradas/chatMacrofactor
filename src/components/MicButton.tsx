"use client";

import { useRef, useState } from "react";

export function MicButton({
  onTranscribed,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await transcribe(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert("No se pudo acceder al micrófono. Revisa los permisos.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setBusy(true);
    try {
      const form = new FormData();
      const ext = blob.type.includes("webm") ? "webm" : "m4a";
      form.append("audio", blob, `audio.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (data.text) onTranscribed(data.text as string);
      else alert(data.error ?? "No se pudo transcribir el audio");
    } catch {
      alert("Error transcribiendo el audio");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      disabled={disabled || busy}
      title={recording ? "Detener y transcribir" : "Hablar (Whisper)"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
        recording
          ? "animate-pulse bg-red-500 text-white"
          : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
      } disabled:opacity-50`}
    >
      {busy ? (
        <Spinner />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}
