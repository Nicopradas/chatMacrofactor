/** Token derivado de APP_PASSWORD; se guarda en cookie y se compara en el middleware. */
export const AUTH_COOKIE = "mf_auth";

export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Token esperado para la contraseña configurada. */
export async function expectedToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null; // sin contraseña configurada → app abierta (modo dev)
  return sha256hex(`${pw}:chat-macrofactor`);
}
