import { getAnthropicClient, defaultModel } from "@/lib/anthropic";
import { buildSystemPrompt } from "@/lib/prompts";
import { normalizeQuestionsPayload } from "@/lib/questions";
import { createMockBrainstormStream } from "@/lib/mockBrainstorm";
import type { TemplateType } from "@/types/session";
import type { ContentBlock, ToolUnion } from "@anthropic-ai/sdk/resources/messages";

export const runtime = "nodejs";

interface BrainstormRequest {
  sessionId: string;
  input?: string;
  template?: string;
  language: "en" | "zh";
  history: Array<{ question: string; answer: string | string[] | number | boolean }>;
  action: "start" | "answer" | "retry";
  turnstileToken?: string;
}

function extractJsonFromText(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  let candidate = fencedMatch?.[1];
  if (!candidate) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      candidate = text.slice(start, end + 1);
    }
  }
  if (!candidate) return null;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stripJsonBlock(text: string) {
  return text.replace(/```json[\s\S]*?```/gi, "").trim();
}

function buildUserMessage(input: string | undefined, history: BrainstormRequest["history"], action: string) {
  const historyText = history
    .map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`)
    .join("\n");

  // Estimate question groups (roughly 3 questions per group)
  const groupCount = Math.ceil(history.length / 3);
  const progressHint = groupCount >= 6
    ? `\n\n[SYSTEM: You have asked ${groupCount} question groups (${history.length} questions total). You MUST call session_end NOW - no more questions allowed.]`
    : groupCount >= 4
    ? `\n\n[SYSTEM: You have asked ${groupCount} question groups. Wrap up with 1-2 more groups maximum, then call session_end.]`
    : "";

  if (action === "start") {
    return `Initial idea:\n${input}\n\nPrevious Q/A:\n${historyText || "(none)"}${progressHint}`;
  }

  if (action === "retry") {
    return `Please retry the last question group.\n\nPrevious Q/A:\n${historyText || "(none)"}${progressHint}`;
  }

  return `Continue the brainstorming.\n\nPrevious Q/A:\n${historyText || "(none)"}${progressHint}`;
}

const MAX_INPUT_LENGTH = 2000;
const MAX_ANSWER_LENGTH = 400;

async function verifyTurnstileToken(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error("[brainstorm] Turnstile verification HTTP error", { status: response.status });
      return false;
    }

    const result = (await response.json()) as { success: boolean; "error-codes"?: string[] };
    if (result.success !== true) {
      console.warn("[brainstorm] Turnstile verification rejected", { errorCodes: result["error-codes"] });
    }
    return result.success === true;
  } catch (error) {
    console.error("[brainstorm] Turnstile verification failed", error);
    return false;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as BrainstormRequest;

  // Verify Turnstile token on start action (if enabled)
  const isTurnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE !== "false";
  if (isTurnstileEnabled && body.action === "start") {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      if (process.env.NODE_ENV === "production") {
        console.error("[brainstorm] Turnstile is enabled but TURNSTILE_SECRET_KEY is missing");
        return new Response(
          JSON.stringify({ error: "Turnstile is enabled but not configured" }),
          { status: 500 },
        );
      }
      console.warn("[brainstorm] TURNSTILE_SECRET_KEY not configured, skipping verification in development");
    }

    if (!body.turnstileToken) {
      return new Response(
        JSON.stringify({ error: "Turnstile verification required" }),
        { status: 403 }
      );
    }

    if (secretKey) {
      const isValid = await verifyTurnstileToken(body.turnstileToken, secretKey);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Turnstile verification failed" }),
          { status: 403 }
        );
      }
    }
  }

  // Validate input length
  if (body.input && body.input.length > MAX_INPUT_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters` }),
      { status: 400 }
    );
  }

  // Validate answer length in history
  for (const item of body.history) {
    if (typeof item.answer === "string" && item.answer.length > MAX_ANSWER_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Answer exceeds maximum length of ${MAX_ANSWER_LENGTH} characters` }),
        { status: 400 }
      );
    }
  }
  const isDev = process.env.NODE_ENV === "development";
  const debug = (...args: unknown[]) => {
    if (isDev) {
      console.log("[brainstorm]", ...args);
    }
  };

  debug("request", {
    sessionId: body.sessionId,
    action: body.action,
    language: body.language,
    historyCount: body.history.length,
    model: defaultModel,
    baseURL: process.env.ANTHROPIC_BASE_URL || "default",
  });

  if (process.env.MOCK_BRAINSTORM === "1") {
    const stream = createMockBrainstormStream({
      input: body.input,
      language: body.language,
      historyCount: body.history.length,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const client = getAnthropicClient();

  const tools: ToolUnion[] = [
    {
      name: "ask_questions",
      input_schema: {
        type: "object",
        properties: {
          groupId: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                title: { type: "string" },
                question: { type: "string" },
                options: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["id", "label"],
                  },
                },
                min: { type: "number" },
                max: { type: "number" },
                step: { type: "number" },
                allowOther: { type: "boolean" },
                minSelections: { type: "number" },
                maxSelections: { type: "number" },
              },
              required: ["id", "type", "title", "question"],
            },
          },
        },
        required: ["groupId", "questions"],
      },
    },
    {
      name: "session_end",
      input_schema: {
        type: "object",
        properties: {
          ready: { type: "boolean" },
        },
        required: ["ready"],
      },
    },
  ];

  const encoder = new TextEncoder();

  const createMessage = async (withTools: boolean) => {
    return client.messages.create({
      model: defaultModel,
      max_tokens: 800,
      temperature: 0.3,
      system: buildSystemPrompt(body.language, body.template as TemplateType | undefined),
      messages: [
        {
          role: "user",
          content: buildUserMessage(body.input, body.history, body.action),
        },
      ],
      tools: withTools ? tools : undefined,
      stream: false as const,
    });
  };

  const parseContent = (content: ContentBlock[]) => {
    let text = "";
    let questions: Record<string, unknown> | null = null;
    let end: Record<string, unknown> | null = null;
    let sawTool = false;

    for (const block of content) {
      if (block.type === "text") {
        text += block.text;
      }

      if (block.type === "tool_use") {
        sawTool = true;
        const input = (block.input ?? {}) as Record<string, unknown>;
        if (block.name === "ask_questions") {
          questions = input;
        }
        if (block.name === "session_end") {
          end = input;
        }
      }
    }

    return { text, questions, end, sawTool };
  };

  let text = "";
  let questions: Record<string, unknown> | null = null;
  let end: Record<string, unknown> | null = null;

  // Log a bit of runtime config in production so Vercel Logs can show what's wrong.
  // Do NOT log the API key itself.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[brainstorm] Missing ANTHROPIC_API_KEY", {
      sessionId: body.sessionId,
      action: body.action,
      language: body.language,
      historyCount: body.history.length,
      model: defaultModel,
      baseURL: process.env.ANTHROPIC_BASE_URL || "default",
    });
  }

  try {
    const message = await createMessage(true);
    const content = message.content ?? [];
    debug("non_streaming_content", { count: content.length, content });
    const parsed = parseContent(content);
    text = parsed.text;
    questions = parsed.questions;
    end = parsed.end;
    if (questions) {
      const groupId = typeof questions.groupId === "string" ? questions.groupId : "unknown";
      const titles = Array.isArray(questions.questions)
        ? questions.questions.map((q) => (typeof q.title === "string" ? q.title : typeof q.question === "string" ? q.question : ""))
        : [];
      debug("questions_preview", { groupId, titles });
    }

    if (!questions && !end && text.trim()) {
      const fallback = extractJsonFromText(text);
      debug("fallback_parse", { ok: Boolean(fallback), fallback });
      if (fallback && Array.isArray(fallback.questions)) {
        questions = fallback;
      } else if (fallback && typeof fallback.ready === "boolean") {
        end = fallback as Record<string, unknown>;
      }
    }

    if (!questions && !end) {
      debug("fallback_non_streaming_attempt");
      const fallbackMessage = await createMessage(false);
      const fallbackContent = fallbackMessage.content ?? [];
      debug("fallback_non_streaming_content", { count: fallbackContent.length, content: fallbackContent });
      const fallbackParsed = parseContent(fallbackContent);
      const fallbackText = fallbackParsed.text;
      if (fallbackParsed.questions) questions = fallbackParsed.questions;
      if (fallbackParsed.end) end = fallbackParsed.end;
      if (!questions && !end && fallbackText.trim()) {
        const fallbackJson = extractJsonFromText(fallbackText);
        if (fallbackJson && Array.isArray(fallbackJson.questions)) {
          questions = fallbackJson;
        } else if (fallbackJson && typeof fallbackJson.ready === "boolean") {
          end = fallbackJson as Record<string, unknown>;
        }
      }
      if (!questions && !end) {
        text = fallbackText || text;
      }
    }
  } catch (err) {
    const e = err as Record<string, unknown>;
    const status = typeof e.status === "number" ? e.status : undefined;
    const message = err instanceof Error ? err.message : String(err);

    console.error("[brainstorm] Upstream API error", {
      sessionId: body.sessionId,
      action: body.action,
      language: body.language,
      historyCount: body.history.length,
      model: defaultModel,
      baseURL: process.env.ANTHROPIC_BASE_URL || "default",
      status,
      message,
    });

    return new Response(
      JSON.stringify({
        error: "Failed to fetch questions",
        upstreamStatus: status,
        message,
      }),
      { status: 500 },
    );
  }

  const responseStream = new ReadableStream({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const displayText = text ? stripJsonBlock(text) : "";
      if (displayText) {
        send({ type: "text", data: displayText });
      }
      if (questions) {
        send({ type: "questions", data: normalizeQuestionsPayload(questions) });
      }
      if (end) {
        send({ type: "end", data: end });
      }
      if (!questions && !end) {
        send({ type: "error", data: "Failed to parse tool output" });
      }
      send({ type: "done", data: null });
      controller.close();
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
