import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { apiUrl } from "./config";

const STORE_KEY = "mf_app_token";

/** Mismo derivado que el backend (`sha256hex(`${pw}:chat-macrofactor`)`). */
async function deriveToken(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${password}:chat-macrofactor`,
  );
}

/** Comprueba contra `/api/me` si un token (o ninguno) es aceptado por el backend. */
async function tokenIsValid(token: string | null): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/me"), {
      headers: token ? { "x-app-token": token } : {},
    });
    return res.ok;
  } catch {
    // Sin red asumimos válido para no bloquear; las peticiones reales reintentarán.
    return true;
  }
}

interface AuthState {
  token: string | null;
  ready: boolean;
  needsLogin: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  ready: false,
  needsLogin: false,
  error: null,

  init: async () => {
    const saved = await SecureStore.getItemAsync(STORE_KEY);
    const ok = await tokenIsValid(saved);
    set({
      token: ok ? saved : null,
      needsLogin: !ok,
      ready: true,
      error: null,
    });
  },

  login: async (password: string) => {
    set({ error: null });
    const token = await deriveToken(password);
    const ok = await tokenIsValid(token);
    if (!ok) {
      set({ error: "Contraseña incorrecta" });
      return;
    }
    await SecureStore.setItemAsync(STORE_KEY, token);
    set({ token, needsLogin: false, error: null });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(STORE_KEY);
    set({ token: null, needsLogin: true });
  },
}));

/** Cabeceras de autorización para las peticiones a la API. */
export function authHeaders(): Record<string, string> {
  const token = useAuth.getState().token;
  return token ? { "x-app-token": token } : {};
}
