# 🍽️ Chat MacroFactor

Web app personal para **estimar calorías reales a partir de fotos de comida** con IA
(Claude) y **registrarlas en tu diario de MacroFactor** con un clic.

Flujo:

1. En el chat adjuntas **una o varias fotos** y explicas el contexto en texto o **por voz**
   (botón de micrófono → Whisper vía Groq). Ej: _"estas 3 fotos son del mismo plato, lo
   compartí entre 3 personas"_.
2. **Claude (visión)** identifica los alimentos, razona el tamaño de la porción usando
   referencias visuales y estima calorías + macros.
3. Cada alimento cae en un **carrito de calorías** que puedes **editar** (nombre, gramos, macros).
4. Pulsas **"Completar"** y se **registra en MacroFactor**.

> ⚠️ La integración con MacroFactor es **no oficial** (reverse-engineered sobre su backend
> de Firebase/Firestore, igual que [`@sjawhar/macrofactor-mcp`](https://www.npmjs.com/package/@sjawhar/macrofactor-mcp)).
> Puede dejar de funcionar si MacroFactor cambia su backend. Úsalo solo con tu cuenta personal.

## Stack

- **Next.js 16** (App Router) + **Tailwind v4**
- **AI SDK v6** + **Claude Opus 4.8** (`@ai-sdk/anthropic`) para el chat con visión
- **Groq Whisper** (`@ai-sdk/groq`) para transcripción de voz
- **Zustand** para el carrito (persistido en `localStorage`)
- Cliente directo a **Firebase Auth + Firestore** de MacroFactor (`src/lib/macrofactor.ts`)

## Puesta en marcha (local)

```bash
cp .env.example .env.local   # y rellena las claves
npm install
npm run dev                  # http://localhost:3000
```

### Variables de entorno

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Claude (chat + visión) |
| `GROQ_API_KEY` | Whisper (transcripción de voz) |
| `MACROFACTOR_EMAIL` / `MACROFACTOR_PASSWORD` | Tu cuenta de MacroFactor (añade contraseña en la app si entras con Google/Apple) |
| `FIREBASE_WEB_API_KEY` | Clave web de Firebase del backend de MacroFactor |
| `TYPESENSE_HOST` / `TYPESENSE_API_KEY` | (Opcional) búsqueda de alimentos en la BBDD de MacroFactor |
| `APP_PASSWORD` | Contraseña para entrar a la web (protege tu cuenta en una URL pública). Vacío = app abierta |

> Las claves `FIREBASE_WEB_API_KEY` y `TYPESENSE_*` son las claves "públicas" de la app
> MacroFactor. Consíguelas en la documentación de `@sjawhar/macrofactor-mcp` o extrayéndolas
> del tráfico de la app. El **registro de comidas funciona sin Typesense**; este solo se usa
> para la búsqueda de alimentos por nombre.

## Deploy en Vercel

```bash
vercel            # primer deploy (preview)
vercel --prod     # producción
```

Configura todas las variables de entorno en **Project Settings → Environment Variables**
(o con `vercel env add`). La app es _mobile-first_: al abrir la URL en el móvil funciona como
una web app (puedes "Añadir a pantalla de inicio").

## Notas sobre la precisión

Estimar **gramos/volumen** desde una foto 2D es el límite real de cualquier IA. Por eso el
carrito es **editable**: Claude te da una estimación razonada (con su nivel de confianza y
supuestos), y tú ajustas antes de registrar. Para máxima precisión, incluye en la foto una
referencia de tamaño (cubierto, mano, envase) y cuéntale a Claude lo que sepas.
