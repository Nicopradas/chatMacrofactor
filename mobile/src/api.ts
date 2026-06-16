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

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  quantity?: string;
  /** Valores por 100 g/ml cuando están disponibles. */
  per100?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

/**
 * Busca un producto por su código de barras en Open Food Facts (base de datos
 * pública y gratuita). Devuelve `null` si no se encuentra.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode,
  )}.json?fields=product_name,product_name_es,brands,quantity,nutriments`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ChatMacrofactor/1.0 (mobile app)" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      product_name_es?: string;
      brands?: string;
      quantity?: string;
      nutriments?: Record<string, number>;
    };
  };
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments ?? {};
  const name = (p.product_name_es || p.product_name || "").trim();
  if (!name) return null;
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : undefined);
  return {
    barcode,
    name,
    brand: p.brands?.split(",")[0]?.trim() || undefined,
    quantity: p.quantity?.trim() || undefined,
    per100: {
      calories: num(n["energy-kcal_100g"]),
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g),
    },
  };
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
