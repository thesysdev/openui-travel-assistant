import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { bookingPrompt } from "../../../lib/prompt";
import { hasAllowedOrigin } from "../../../lib/same-origin";
import { executeSearchStays, searchStaysTool, today } from "../../../lib/tools/search-stays";

export const runtime = "nodejs";

// Nothing is stored on a server: threads live in the visitor's browser, which sends the whole
// thread each turn. Only questions and answers are forwarded; tool calls and results from the
// browser are dropped, so every stay the model sees comes from a search this server ran.
// (A submitted form arrives as a user message carrying its values, so questions can be long.)
const MAX_MESSAGES = 60;
const MAX_CHARS = 8000;

function conversation(sent: unknown): ChatCompletionMessageParam[] | null {
  if (!Array.isArray(sent) || !sent.length || sent.length > MAX_MESSAGES) return null;
  const thread: ChatCompletionMessageParam[] = [];
  for (const message of sent as { role?: unknown; content?: unknown }[]) {
    if (message?.role !== "user" && message?.role !== "assistant") continue;
    if (typeof message.content !== "string" || !message.content.trim()) continue;
    if (message.content.length > MAX_CHARS) return null;
    thread.push({ role: message.role, content: message.content });
  }
  return thread.at(-1)?.role === "user" ? thread : null;
}

export async function POST(request: Request) {
  // No sign-in: accept requests only from this app's own pages.
  if (!hasAllowedOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });
  let thread: ChatCompletionMessageParam[] | null = null;
  try {
    thread = conversation(((await request.json()) as { messages?: unknown }).messages);
  } catch {}
  if (!thread)
    return Response.json({ error: "Send the thread's messages, ending with the user's." }, { status: 400 });
  const apiKey = process.env.THESYS_API_KEY;
  if (!apiKey) throw new Error("Set THESYS_API_KEY in .env.local, then restart.");

  const gateway = new OpenAI({ apiKey, baseURL: "https://api.thesys.dev/v1/embed" });
  const searchTool = searchStaysTool();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: bookingPrompt(today()) },
    ...thread,
  ];

  // runTools requests a completion, runs the tools the model calls, sends their results back, and
  // repeats until the model answers. It runs only the tools registered here.
  const runner = gateway.chat.completions.runTools(
    {
      model: process.env.OPENUI_MODEL || "openai/gpt-5.5",
      messages,
      tools: [
        {
          type: "function",
          function: {
            ...searchTool.function,
            // runTools ends the run when a tool throws, so return the error as the tool's result.
            function: (args: string) =>
              executeSearchStays(args, { signal: request.signal }).catch((error: unknown) =>
                JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
              ),
          },
        },
      ],
      max_completion_tokens: 6000,
      // A public demo: ask Gateway not to keep the completion.
      store: false,
      stream: true,
    },
    { signal: request.signal, maxChatCompletions: 3 },
  );

  // The runner's stream carries every completion's chunks, one JSON object per line, and Agent
  // Interface reads it with openAIReadableStreamAdapter(). Creating it now means no chunk is
  // missed while the route waits below.
  const stream = runner.toReadableStream();

  // Wait for the first chunk, so a rejected key, rate limit, or unknown model returns as an HTTP
  // error with Gateway's message instead of failing mid-stream. Gateway reports some errors, such
  // as an unknown model, inside a successful response, so waiting for the response isn't enough.
  try {
    await Promise.race([runner.emitted("chunk"), runner.done()]);
  } catch (error) {
    const upstream = error as { status?: number; message?: string };
    return Response.json(
      { error: upstream.message ?? "OpenUI Gateway request failed." },
      { status: upstream.status ?? 502 },
    );
  }

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache, no-transform" },
  });
}
