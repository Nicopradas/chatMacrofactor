import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const expected = await expectedToken();
  // Sin APP_PASSWORD configurada → no se exige login.
  if (!expected) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Protege todo salvo estáticos de Next y assets públicos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)"],
};
