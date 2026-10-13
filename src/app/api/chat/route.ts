import { storeChatCompletionHistory } from "@openuidev/server/openai";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod/v4";
import { frontendToken } from "../../../lib/frontend-token";
import { HistoryLoadError, loadChatCompletionHistory } from "../../../lib/gateway-history";
import { bookingPrompt } from "../../../lib/prompt";
import { hasAllowedOrigin } from "../../../lib/same-origin";
import { executeSearchStays, searchStaysTool, today } from "../../../lib/tools/search-stays";
import { readUserId } from "../../../lib/user-id";

export const runtime = "nodejs";

// Agent Interface's storage creates the Gateway conversation first and sends its id as threadId.
// The browser sends the whole thread; only its last message, the new question, is used. (A
// submitted form arrives as a user message carrying its values, so questions can be long.)
const chatRequestSchema = z.object({
  threadId: z.string().max(256).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  messages: z
    .array(z.unknown())
    .min(1)
    .transform((messages) => messages.at(-1))
    .pipe(z.object({ role: z.literal("user"), content: z.string().trim().min(1).max(8000) })),
});

export async function POST(request: Request) {
  // No sign-in: requests come only from this app's pages, from an anonymous visitor (lib/user-id.ts).
  if (!hasAllowedOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const body = chatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return Response.json(
      { error: "Send a threadId and the thread's messages, ending with the user's." },
      { status: 400 },
    );
  const { threadId, messages: question } = body.data; // messages is narrowed to the last one
  const userId = readUserId(request);
  if (!userId) return Response.json({ error: "Missing visitor id." }, { status: 401 });
  const apiKey = process.env.THESYS_API_KEY;
  if (!apiKey) throw new Error("Set THESYS_API_KEY in .env.local, then restart.");

  // The thread's earlier turns, with their tool calls and results, loaded from its Gateway
  // conversation rather than taken from the browser, so every stay the model sees came from a
  // search this server ran. It reads as the visitor, not with the API key: Gateway refuses a
  // thread that isn't theirs, so knowing a conversation id isn't enough to read or add to someone
  // else's chat. Once it's confirmed theirs, the turn is stored with the key below.
  let history: ChatCompletionMessageParam[];
  try {
    const { token } = await frontendToken(apiKey, userId, request.signal);
    history = await loadChatCompletionHistory({
      frontendToken: token,
      conversationId: threadId,
      signal: request.signal,
    });
  } catch (error) {
    if (error instanceof HistoryLoadError && (error.status === 403 || error.status === 404))
      return Response.json({ error: "This thread isn't available." }, { status: 404 });
    return Response.json({ error: "Could not load this thread from OpenUI Gateway." }, { status: 502 });
  }

  const gateway = new OpenAI({ apiKey, baseURL: "https://api.thesys.dev/v1/embed" });
  const searchTool = searchStaysTool();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: bookingPrompt(today()) },
    ...history,
    question,
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
      stream: true,
    },
    { signal: request.signal, maxChatCompletions: 3 },
  );

  // Chat Completions doesn't write to the conversation, so store this turn when the run ends: the
  // user's message, then each message the run adds, which are the tool calls, their results, and
  // the answer. Agent Interface loads them when the thread is opened again. A stopped or failed
  // run still stores the user's message and whatever finished before it ended.
  const turn: ChatCompletionMessageParam[] = [question];
  runner.on("message", (message) => turn.push(message));
  const stored = runner
    .done()
    .catch(() => {})
    .then(() => storeChatCompletionHistory({ apiKey, conversationId: threadId, messages: turn }))
    .catch((error: unknown) =>
      console.error("Could not store the turn in the Gateway conversation.", error),
    );

  // The runner's stream carries every completion's chunks, one JSON object per line, and Agent
  // Interface reads it with openAIReadableStreamAdapter(). It ends once the turn is stored, so a
  // follow-up loads it. Creating it now means no chunk is missed while the route waits below.
  const stream = runner.toReadableStream().pipeThrough(
    new TransformStream({
      async flush() {
        await stored;
      },
    }),
  );

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
