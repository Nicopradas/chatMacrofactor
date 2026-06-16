import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const expected = await expectedToken();
  // Sin APP_PASSWORD configurada → no se exige login.
  if (!expected) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // /api/blob/upload recibe el callback server-to-server de Vercel Blob (sin
  // cookie); la autorización del usuario se valida dentro del propio endpoint.
  if (
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname === "/api/blob/upload"
  ) {
    return NextResponse.next();
  }

  // App nativa (iOS): no maneja cookies cómodamente, así que autentica enviando
  // el token derivado de la contraseña en una cabecera. RN no aplica CORS, así
  // que esto es seguro siempre que el token coincida con el esperado.
  const headerToken = req.headers.get("x-app-token");
  if (headerToken && headerToken === expected) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token === expected) return NextResponse.next();

  // Para rutas de API (incluida la app nativa) devolvemos 401 JSON en vez de
  // redirigir: un fetch no puede "navegar" a /login y seguir un redirect aquí
  // solo confunde al cliente.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Protege todo salvo estáticos de Next y assets públicos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)"],
};
