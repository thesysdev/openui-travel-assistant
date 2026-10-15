import { findPhoto } from "../../../../lib/photos";

export const runtime = "nodejs";

// One photo for a moodboard image or a planner card (src/lib/photos.ts finds it).

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0, 120);
  if (!query) return Response.json({ error: "Send q." }, { status: 400 });
  const photo = await findPhoto(query, params.get("kind") === "scene" ? "scene" : "named");
  return photo ? Response.json(photo) : Response.json(null, { status: 404 });
}
