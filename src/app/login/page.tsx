"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const from = new URLSearchParams(window.location.search).get("from") || "/";
      window.location.href = from;
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-neutral-100 p-4 dark:bg-neutral-950">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow dark:bg-neutral-900">
        <div className="text-center">
          <p className="text-3xl">🍽️</p>
          <h1 className="mt-1 text-lg font-semibold">Chat MacroFactor</h1>
          <p className="text-sm text-neutral-400">Enter the access password</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-2.5 outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
        {error && <p className="text-center text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
