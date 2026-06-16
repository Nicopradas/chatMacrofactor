# 📱 Chat MacroFactor — app iOS (Expo / React Native)

App nativa de iOS que reusa el **backend** de la web (`../src/app/api/*` en Vercel/Next).
Toda la UI (chat, carrito, voz, cámara) está reescrita en React Native; el servidor con
los secretos (Claude, Groq, Vercel Blob) sigue viviendo en el proyecto Next de la raíz.

## Arquitectura

```
App iOS (Expo)  ──►  Backend Next.js (Vercel o `next dev`)
  UI nativa            /api/chat        (Claude, streaming)
  expo/fetch  ◄──────  /api/transcribe  (Groq Whisper)
  x-app-token          /api/blob/upload-direct (Vercel Blob)
                       /api/me          (valida el token de la app)
```

- **Streaming**: `useChat` (`@ai-sdk/react`) sobre `expo/fetch` + polyfills (`polyfills.ts`).
- **Auth**: la app deriva el token de `APP_PASSWORD` con `expo-crypto`
  (`sha256(password + ":chat-macrofactor")`), lo guarda en `expo-secure-store` y lo manda
  en la cabecera `x-app-token`. El proxy/middleware del backend (`../src/proxy.ts`) lo acepta.
- **Carrito**: `zustand` + `AsyncStorage`. "Registrar en MacroFactor" abre el atajo de
  Apple Shortcuts (`shortcuts://`) igual que la web.

## Arrancar (simulador iOS)

1. **Backend** (desde la raíz del repo): `npm run dev` → `http://localhost:3000`.
   El simulador alcanza el `localhost` del Mac sin más.
2. **App** (desde `mobile/`): `npx expo start --ios`.

> Para que el chat responda, el backend necesita `ANTHROPIC_API_KEY` (y `GROQ_API_KEY`,
> `BLOB_READ_WRITE_TOKEN`). En `.env.local` están vacías; haz `vercel env pull` o rellénalas.

## iPhone físico

`localhost` no vale: define la base con la IP LAN del Mac o la URL de producción (https):

```bash
# mobile/.env
EXPO_PUBLIC_API_BASE=http://192.168.1.84:3000      # dev por LAN
# EXPO_PUBLIC_API_BASE=https://tu-app.vercel.app    # producción
```

Variables opcionales:

| Variable | Para qué |
|---|---|
| `EXPO_PUBLIC_API_BASE` | Base del backend (def. `http://localhost:3000`) |
| `EXPO_PUBLIC_MF_SHORTCUT_NAME` | Nombre del atajo de Shortcuts (def. `Log Chat MacroFactor`) |

## Notas

- Las fotos se comprimen en el dispositivo (`expo-image-manipulator`, lado largo ≤1568px)
  antes de subirse a Vercel Blob, igual que en la web.
- `expo-image-picker`, `expo-audio` y `expo-secure-store` funcionan en **Expo Go**; para una
  build nativa con icono/permisos propios usa `npx expo run:ios` (requiere CocoaPods).
