import { getMacroFactorClient } from "@/lib/macrofactor";

export const maxDuration = 30;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json({ hits: [] });

  try {
    const client = getMacroFactorClient();
    const hits = await client.searchFoods(q);
    return Response.json({ hits });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error searching foods" },
      { status: 500 },
    );
  }
}
