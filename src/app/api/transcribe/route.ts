import { createGroq } from "@ai-sdk/groq";
import { experimental_transcribe as transcribe } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GROQ_API_KEY is not configured" }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "No audio received" }, { status: 400 });
  }

  const groq = createGroq({ apiKey });
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const result = await transcribe({
      model: groq.transcription("whisper-large-v3-turbo"),
      audio: bytes,
      providerOptions: { groq: { language: "en" } },
    });
    return Response.json({ text: result.text });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 },
    );
  }
}
