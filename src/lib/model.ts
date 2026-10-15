import type { ReasoningEffort } from "openai/resources/shared";

// The model every agent uses, how long it reasons, and which providers may serve it.
// - OPENUI_MODEL: defaults to GPT-5.6 Terra, which writes valid OpenUI Lang about as reliably as the
//   frontier models but starts streaming in a few seconds.
// - OPENUI_REASONING_EFFORT: defaults to low, which keeps the first text quick. A route that sets its
//   own effort keeps it.
// - OPENUI_PROVIDER: optional OpenRouter provider slugs, comma-separated (e.g. "cerebras/fp16" with
//   openai/gpt-oss-120b). When set, requests go only to those providers and fail rather than fall back.
export function modelOptions() {
  const providers = (process.env.OPENUI_PROVIDER ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  return {
    model: process.env.OPENUI_MODEL || "openai/gpt-5.6-terra",
    reasoning_effort: (process.env.OPENUI_REASONING_EFFORT?.trim() || "low") as ReasoningEffort,
    ...(providers.length > 0 && { provider: { only: providers, allow_fallbacks: false } }),
  };
}
