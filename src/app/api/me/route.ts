/**
 * Endpoint trivial para que la app nativa valide su token: si el proxy/middleware
 * deja pasar la petición (cookie o cabecera `x-app-token` correctas, o sin
 * APP_PASSWORD), responde 200. Si no, el middleware responde 401 antes de llegar aquí.
 */
export function GET() {
  return Response.json({ ok: true });
}
