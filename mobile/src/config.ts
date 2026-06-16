/**
 * Base del backend (el mismo Next.js de la web, en Vercel o en `next dev` local).
 * - Simulador de iOS: `http://localhost:3000` alcanza el Mac anfitrión.
 * - iPhone físico: usa la IP LAN del Mac (`http://192.168.x.x:3000`) o la URL de
 *   producción (https) — defínela en `EXPO_PUBLIC_API_BASE` (.env / app.json extra).
 */
export const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:3000";

/** URL absoluta de una ruta de la API. */
export const apiUrl = (path: string) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

/** Nombre EXACTO del atajo de Apple Shortcuts que registra en MacroFactor. */
export const MF_SHORTCUT_NAME =
  (process.env.EXPO_PUBLIC_MF_SHORTCUT_NAME as string | undefined) ||
  "Log Chat MacroFactor";
