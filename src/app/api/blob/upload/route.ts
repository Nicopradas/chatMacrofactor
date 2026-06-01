import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

/** Lee una cookie del header sin depender de la API (async) de next/headers. */
function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/**
 * Genera tokens de subida para que el navegador suba las fotos DIRECTAMENTE a
 * Vercel Blob (client upload). Así el cuerpo de /api/chat ya no carga el base64
 * de las imágenes, sino solo sus URLs: se elimina el límite de 4,5 MB de Vercel.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      request,
      body,
      // Solo se llama en la fase de generar token (no en el callback de Vercel).
      onBeforeGenerateToken: async () => {
        const expected = await expectedToken();
        if (expected && readCookie(request, AUTH_COOKIE) !== expected) {
          throw new Error("No autorizado");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      // Lo llama Vercel Blob al terminar (server-to-server). No corre en localhost.
      onUploadCompleted: async () => {},
    });
    return Response.json(json);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error de subida" },
      { status: 400 },
    );
  }
}
