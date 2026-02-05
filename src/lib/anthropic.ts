import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
const baseURL = process.env.ANTHROPIC_BASE_URL || undefined;
const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

export function getAnthropicClient() {
  return new Anthropic({ apiKey, baseURL });
}

export const defaultModel = model;
