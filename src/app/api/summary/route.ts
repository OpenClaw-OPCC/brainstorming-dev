import { getAnthropicClient, defaultModel } from "@/lib/anthropic";
import { buildSummaryMarkdownPrompt, buildSummaryPrompt } from "@/lib/prompts";
import { summaryToMarkdown } from "@/lib/markdown";
import { createMockSummaryResponse } from "@/lib/mockBrainstorm";
import type { Summary } from "@/types/summary";
import type { ContentBlock, ToolUnion } from "@anthropic-ai/sdk/resources/messages";

export const runtime = "nodejs";

interface SummaryRequest {
  sessionId: string;
  language: "en" | "zh";
  history: Array<{ question: string; answer: string | string[] | number | boolean }>;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SummaryRequest;
  const isDev = process.env.NODE_ENV === "development";
  const debug = (...args: unknown[]) => {
    if (isDev) {
      console.log("[summary]", ...args);
    }
  };

  if (process.env.MOCK_BRAINSTORM === "1") {
    return Response.json(createMockSummaryResponse(body.language));
  }

  const client = getAnthropicClient();

  const tools: ToolUnion[] = [
    {
      name: "generate_summary",
      input_schema: {
        type: "object",
        properties: {
          summary: {
            type: "object",
            properties: {
              overview: { type: "string" },
              features: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string" },
                  },
                  required: ["name", "description", "priority"],
                },
              },
              technicalPlan: { type: "string" },
              interactions: { type: "string" },
              risks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    mitigation: { type: "string" },
                    severity: { type: "string" },
                  },
                  required: ["description", "mitigation", "severity"],
                },
              },
              openQuestions: { type: "array", items: { type: "string" } },
              generatedAt: { type: "string" },
            },
            required: ["overview", "features", "risks", "openQuestions", "generatedAt"],
          },
        },
        required: ["summary"],
      },
    },
  ];

  const historyText = body.history
    .map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`)
    .join("\n");

  // Log a bit of runtime config in production so Vercel Logs can show what's wrong.
  // Do NOT log the API key itself.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[summary] Missing ANTHROPIC_API_KEY", {
      sessionId: body.sessionId,
      language: body.language,
      historyCount: body.history.length,
      model: defaultModel,
      baseURL: process.env.ANTHROPIC_BASE_URL || "default",
    });
  }

  try {
    const markdownResponse = await client.messages.create({
      model: defaultModel,
      max_tokens: 4000,
      system: buildSummaryMarkdownPrompt(body.language),
      messages: [
        {
          role: "user" as const,
          content: `Write the requirements document based on this Q&A:\n\n${historyText}`,
        },
      ],
      stream: false as const,
    });

    const markdownContent = (markdownResponse.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? String(block.text) : ""))
      .join("\n");
    debug("markdown_content", markdownContent);

    if (markdownContent.trim()) {
      return Response.json({ summary: null, markdown: markdownContent });
    }
  } catch (err) {
    const e = err as Record<string, unknown>;
    const status = typeof e.status === "number" ? e.status : undefined;
    const message = err instanceof Error ? err.message : String(err);

    console.error("[summary] Upstream API error (markdown attempt)", {
      sessionId: body.sessionId,
      language: body.language,
      historyCount: body.history.length,
      model: defaultModel,
      baseURL: process.env.ANTHROPIC_BASE_URL || "default",
      status,
      message,
    });

    // fall through to tool-based summary
  }

  const toolChoice = { type: "tool", name: "generate_summary" } as const;

  const requestPayload = {
    model: defaultModel,
    max_tokens: 1200,
    system: buildSummaryPrompt(body.language),
    messages: [
      {
        role: "user" as const,
        content: `Summarize the brainstorming session into a structured requirements summary.\n\n${historyText}`,
      },
    ],
  };

  const isSummary = (value: unknown): value is Summary => {
    if (!value || typeof value !== "object") return false;
    const v = value as Summary;
    return (
      typeof v.overview === "string" &&
      Array.isArray(v.features) &&
      Array.isArray(v.risks) &&
      Array.isArray(v.openQuestions) &&
      typeof v.generatedAt === "string"
    );
  };

  let response: { content: ContentBlock[] } | null;
  try {
    response = (await client.messages.create({
      ...requestPayload,
      tools,
      tool_choice: toolChoice,
      stream: false as const,
    })) as unknown as { content: ContentBlock[] };
  } catch (err) {
    const e = err as Record<string, unknown>;
    const status = typeof e.status === "number" ? e.status : undefined;
    const message = err instanceof Error ? err.message : String(err);

    console.error("[summary] Upstream API error (tool attempt)", {
      sessionId: body.sessionId,
      language: body.language,
      historyCount: body.history.length,
      model: defaultModel,
      baseURL: process.env.ANTHROPIC_BASE_URL || "default",
      status,
      message,
    });

    response = null;
  }

  const content: ContentBlock[] = response?.content ?? [];
  debug("content", content);

  const toolBlock = content.find(
    (block) => block.type === "tool_use" && block.name === "generate_summary",
  );

  if (toolBlock && toolBlock.type === "tool_use") {
    const input = (toolBlock.input ?? {}) as Record<string, unknown>;
    const summaryCandidate = (input.summary ?? toolBlock.input) as unknown;
    if (isSummary(summaryCandidate)) {
      const markdown = summaryToMarkdown(summaryCandidate);
      return Response.json({ summary: summaryCandidate, markdown });
    }
  }

  const textBlocks = content.filter(
    (block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text",
  );
  const text = textBlocks.map((block) => block.text).join("\n");

  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as unknown;
      const summaryCandidate =
        parsed && typeof parsed === "object" && "summary" in (parsed as Record<string, unknown>)
          ? (parsed as { summary?: unknown }).summary
          : parsed;
      if (isSummary(summaryCandidate)) {
        const markdown = summaryToMarkdown(summaryCandidate);
        return Response.json({ summary: summaryCandidate, markdown });
      }
    } catch {
      // fall through
    }
  }

  if (text.trim()) {
    return Response.json({ summary: null, markdown: text });
  }

  const fallbackMarkdown = [
    "# Requirements Summary",
    "",
    "## Q&A",
    ...body.history.map((item, index) => `- **Q${index + 1}:** ${item.question}\n  - ${item.answer}`),
  ].join("\n");

  return Response.json({ summary: null, markdown: fallbackMarkdown });
}
