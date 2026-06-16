import { put } from "@vercel/blob";

export const maxDuration = 60;

/**
 * Subida directa de imágenes para la app nativa (iOS). El cliente web usa el
 * flujo de "client upload" (`/api/blob/upload`), pero en React Native es más
 * fiable enviar la imagen ya comprimida como multipart y subirla server-side.
 * La autorización la cubre el proxy/middleware (cabecera `x-app-token`).
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) {
      return Response.json({ error: "No se recibió imagen" }, { status: 400 });
    }
    const name =
      (form.get("filename") as string | null)?.replace(/[^\w.\-]/g, "_") ||
      "foto.jpg";

    const blob = await put(`chat/${name}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || "image/jpeg",
    });
    return Response.json({ url: blob.url });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error de subida" },
      { status: 400 },
    );
  }
}
