import { authHeaders } from "./auth";
import { apiUrl } from "./config";

/** Sube una imagen local (uri de expo-image-picker/manipulator) y devuelve su URL pública. */
export async function uploadImage(uri: string, name: string): Promise<string> {
  const form = new FormData();
  // RN: un fichero en FormData es { uri, name, type }.
  form.append("image", { uri, name, type: "image/jpeg" } as unknown as Blob);
  form.append("filename", name);
  const res = await fetch(apiUrl("/api/blob/upload-direct"), {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`upload ${res.status}: ${msg}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

/** Envía un audio grabado a Whisper (vía backend) y devuelve la transcripción. */
export async function transcribeAudio(uri: string): Promise<string> {
  const form = new FormData();
  form.append("audio", {
    uri,
    name: "audio.m4a",
    type: "audio/m4a",
  } as unknown as Blob);
  const res = await fetch(apiUrl("/api/transcribe"), {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok || data.error) throw new Error(data.error || `transcribe ${res.status}`);
  return data.text ?? "";
}
