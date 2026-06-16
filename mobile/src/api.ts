import * as FileSystem from "expo-file-system/legacy";
import { authHeaders } from "./auth";
import { apiUrl } from "./config";

// En React Native, el `FormData` de JS con ficheros ({ uri }) falla en el módulo
// de red nativo ("Unsupported FormData part implementation"). La vía fiable es la
// subida multipart NATIVA de expo-file-system (`uploadAsync`).

/** Sube una imagen local y devuelve su URL pública (Vercel Blob). */
export async function uploadImage(uri: string, name: string): Promise<string> {
  const res = await FileSystem.uploadAsync(apiUrl("/api/blob/upload-direct"), uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "image",
    mimeType: "image/jpeg",
    parameters: { filename: name },
    headers: authHeaders(),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`upload ${res.status}: ${res.body}`);
  }
  const data = JSON.parse(res.body) as { url: string };
  return data.url;
}

/** Envía un audio grabado a Whisper (vía backend) y devuelve la transcripción. */
export async function transcribeAudio(uri: string): Promise<string> {
  const res = await FileSystem.uploadAsync(apiUrl("/api/transcribe"), uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "audio",
    mimeType: "audio/m4a",
    headers: authHeaders(),
  });
  let data: { text?: string; error?: string } = {};
  try {
    data = JSON.parse(res.body);
  } catch {
    /* respuesta no-JSON */
  }
  if (res.status < 200 || res.status >= 300 || data.error) {
    throw new Error(data.error || `transcribe ${res.status}`);
  }
  return data.text ?? "";
}
