import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = await expectedToken();
  if (!expected) {
    return Response.json({ ok: true }); // sin contraseña configurada
  }

  let password = "";
  try {
    password = (await req.json()).password ?? "";
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const { sha256hex } = await import("@/lib/auth");
  const token = await sha256hex(`${password}:chat-macrofactor`);
  if (token !== expected) {
    return Response.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 90}; Secure`,
  );
  return res;
}
