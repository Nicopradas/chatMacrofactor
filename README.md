# 🍽️ Chat MacroFactor

Estimate the **real calories and macros of your meals from photos** with AI (Claude) and
**log them to your MacroFactor diary** in one tap, from your phone or computer.

This is a **self-hosted** web app: you deploy it with **your own Claude API key** and log to
MacroFactor through an **Apple Shortcut** (bundled in this repo). There's no central server and no
accounts — your keys and your data stay yours.

## How it works

1. In the chat you attach **one or more photos** and add context by text or **voice**. E.g.
   _"these 3 photos are the same dish, I split it between 3 people"_.
2. **Claude (vision)** identifies the foods, reasons about portion size using visual references, and
   estimates **calories + macros**.
3. Each food lands in an editable **cart** (name, grams, macros).
4. You hit **"Complete"** and the app opens the **Apple Shortcut**, which logs everything to
   MacroFactor using its official _"Log by JSON"_ action. Confirm in Shortcuts and you're done.

> Logging happens **on your device** via the shortcut (your MacroFactor credentials are never sent
> to any server). You need the **MacroFactor** app installed, since it's what provides the
> _"Log by JSON"_ action to the Shortcuts app.

## Requirements

- An **Anthropic (Claude) API key** — required. Get one at
  [console.anthropic.com](https://console.anthropic.com/). API usage is billed to your account.
- An **iPhone or Mac** with the **Shortcuts** app and the **MacroFactor** app (for logging).
- _(Optional)_ A **Groq API key** to transcribe voice with Whisper:
  [console.groq.com/keys](https://console.groq.com/keys).

## Getting started (local)

```bash
cp .env.example .env.local   # fill in at least ANTHROPIC_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | What for |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude (chat + vision). Your Anthropic key. |
| `GROQ_API_KEY` | — | Whisper, to talk instead of type. Without it, the voice button is disabled. |
| `APP_PASSWORD` | — | Password to access the web app (set it if you host it on a public URL). Empty = open. |
| `NEXT_PUBLIC_MF_SHORTCUT_NAME` | — | Name of the shortcut to invoke. Only if you rename it (defaults to `Log Chat MacroFactor`). |

## Install the Apple Shortcut

Logging to MacroFactor is done by a shortcut bundled in this repo:
[`shortcut/Log Chat MacroFactor.shortcut`](shortcut/Log%20Chat%20MacroFactor.shortcut).

1. Make sure the **MacroFactor** and **Shortcuts** apps are installed on your iPhone/Mac.
2. Open `shortcut/Log Chat MacroFactor.shortcut` (double-click, or open it on your phone). It's
   **signed**, so it imports directly without having to allow "untrusted shortcuts".
3. Add it in Shortcuts. **Keep the name** exactly **`Log Chat MacroFactor`**, since that's the name
   the web app invokes.
   - If you prefer a different name, set it in `NEXT_PUBLIC_MF_SHORTCUT_NAME`.
4. In the web app, hit **"Complete"** in the cart: Shortcuts opens with your foods preloaded —
   confirm it and MacroFactor logs them.

## Deploy on Vercel

```bash
vercel            # first deploy (preview)
vercel --prod     # production
```

Set the variables in **Project Settings → Environment Variables** (or `vercel env add`). The app is
_mobile-first_: open the URL on your phone and "Add to Home Screen" to use it like a native app.

> Recommended: set an `APP_PASSWORD` if your URL is public, so only you can get in.

## Stack

- **Next.js 16** (App Router) + **Tailwind v4**
- **AI SDK v6** + **Claude Opus 4.8** (`@ai-sdk/anthropic`) for the vision chat
- **Groq Whisper** (`@ai-sdk/groq`) for voice transcription (optional)
- **Zustand** for the cart (persisted in `localStorage`)
- **Apple Shortcuts** + MacroFactor's official _"Log by JSON"_ action for logging

## A note on accuracy

Estimating **grams/volume** from a 2D photo is the real limit of any AI. That's why the cart is
**editable**: Claude gives you a reasoned estimate (with its confidence level and assumptions) and
you adjust before logging. For best results, include a size reference in the photo (utensil, hand,
container) and tell Claude whatever you know.

---

Personal project, not affiliated with MacroFactor or Anthropic. Use at your own risk.
</content>
