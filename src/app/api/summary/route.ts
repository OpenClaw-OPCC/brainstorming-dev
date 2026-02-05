import { getAnthropicClient, defaultModel } from "@/lib/anthropic";
import { buildSummaryMarkdownPrompt, buildSummaryPrompt } from "@/lib/prompts";
import { summaryToMarkdown } from "@/lib/markdown";
import { createMockSummaryResponse } from "@/lib/mockBrainstorm";
import type { Summary } from "@/types/summary";

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

  const tools = [
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

  try {
    const markdownResponse = await client.messages.create({
      model: defaultModel,
      max_tokens: 4000,
      system: buildSummaryMarkdownPrompt(body.language),
      messages: [
        {
          role: "user",
          content: `Write the requirements document based on this Q&A:\n\n${historyText}`,
        },
      ],
    });

    const markdownContent = (markdownResponse.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? String(block.text) : ""))
      .join("\n");
    debug("markdown_content", markdownContent);

    if (markdownContent.trim()) {
      return Response.json({ summary: null, markdown: markdownContent });
    }
  } catch {
    // fall through
  }

  const toolChoice = { type: "tool", name: "generate_summary" } as const;

  const requestPayload = {
    model: defaultModel,
    max_tokens: 1200,
    system: buildSummaryPrompt(body.language),
    messages: [
      {
        role: "user",
        content: `Summarize the brainstorming session into a structured requirements summary.\n\n${historyText}`,
      },
    ],
  };

  let response;
  try {
    response = await client.messages.create({
      ...requestPayload,
      tools,
      tool_choice: toolChoice,
    });
  } catch {
    response = null;
  }

  const content = response?.content ?? [];
  debug("content", content);

  const toolBlock = content.find(
    (block) => block.type === "tool_use" && "name" in block && block.name === "generate_summary",
  ) as { type: "tool_use"; input: { summary?: Summary } } | undefined;

  if (toolBlock?.type === "tool_use") {
    const summary = toolBlock.input.summary ?? (toolBlock.input as Summary);
    const markdown = summaryToMarkdown(summary);
    return Response.json({ summary, markdown });
  }

  const textBlocks = content.filter((block) => block.type === "text") as Array<{ text?: string }>;
  const text = textBlocks.map((block) => block.text ?? "").join("\n");
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as { summary?: Summary } | Summary;
      const summary = "summary" in parsed ? parsed.summary : parsed;
      if (summary) {
        const markdown = summaryToMarkdown(summary);
        return Response.json({ summary, markdown });
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
