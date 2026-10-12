import OpenAI from "openai";
import { hasAllowedOrigin } from "../../../../lib/same-origin";

// The Explore agent, asked from the Itinerary board: a short answer plus the places it suggests,
// as JSON, so the board can show them as cards to drag onto a day. Requests that reshape the plan
// go to the itinerary agent instead; the board routes by intent.

export const runtime = "nodejs";


const system = `You are a warm, well-travelled friend helping someone plan a trip. They are looking at their itinerary board and ask a question.
Reply with JSON only, no prose around it and no code fences:
{"answer":"…","places":[{"name":"…","subject":"…","note":"…","kind":"place"}]}
Rules:
- "answer" is two or three short sentences that answer the question directly, specific to this trip.
- "places" are the 2 to 6 real places, dishes or stays your answer suggests, best first, so they can drag them onto a day. Leave it empty when the question isn't about places.
- "name" is short (1 to 4 words); "subject" is the exact English Wikipedia article title, so its photo can be found; "note" is why, 2 to 6 words, lower case; "kind" is "place", "food" (a dish or a food market) or "stay".
- Don't suggest what's already on the board.`;

export async function POST(request: Request) {
  // No sign-in: accept requests only from this app's own pages, so scripts can't spend credit.
  if (!hasAllowedOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const { prompt, place, dates, saved, context, traveller } = (await request.json()) as {
    prompt?: string;
    place?: string;
    dates?: string;
    saved?: string[];
    context?: string;
    traveller?: string;
  };
  if (!prompt?.trim()) return Response.json({ error: "Ask something." }, { status: 400 });
  const apiKey = process.env.THESYS_API_KEY;
  if (!apiKey) return Response.json({ error: "Set THESYS_API_KEY in .env.local." }, { status: 500 });
  const gateway = new OpenAI({ apiKey, baseURL: "https://api.thesys.dev/v1/embed" });
  const brief = [
    traveller?.slice(0, 300),
    place ? `The trip: ${place}${dates ? `, ${dates}` : ""}.` : "",
    context ? `What they asked so far: ${context.slice(0, 600)}` : "",
    saved?.length ? `Already on the board: ${saved.slice(0, 40).join(", ")}.` : "",
    `Question: ${prompt.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
  // The answer streams to the browser as JSON text, which the panel reads as it grows (partial
  // JSON), so the answer writes in and place cards appear as each one is complete. The model
  // reasons before it answers, so give it room; if a reply comes back empty, ask once more.
  const open = () =>
    gateway.chat.completions.create(
      {
        model: process.env.OPENUI_MODEL || "openai/gpt-5.5",
        store: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: brief },
        ],
        max_completion_tokens: 8000,
        stream: true,
      },
      { signal: request.signal },
    );
  // Open the first attempt before responding, so a rejected key or rate limit returns as an HTTP
  // error instead of failing mid-stream.
  let first: Awaited<ReturnType<typeof open>>;
  try {
    first = await open();
  } catch {
    return Response.json({ error: "The answer didn't come back. Ask again?" }, { status: 502 });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let attempt = 0, completion = first; attempt < 2; attempt++) {
          let wrote = false;
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content;
            if (!text) continue;
            wrote = true;
            controller.enqueue(encoder.encode(text));
          }
          if (wrote || attempt === 1) break;
          completion = await open();
        }
      } catch {
        // A dropped connection ends the stream; the panel says the answer didn't come through.
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
}
