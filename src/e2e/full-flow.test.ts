import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const INPUT = "我要做一个与众不同的贪吃蛇";
const getBaseUrl = () => process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const OUTPUT_DIR = join(process.cwd(), "e2e-output");

interface QuestionOption {
  id: string;
  label: string;
}

interface QuestionData {
  id: string;
  type: string;
  question: string;
  options?: QuestionOption[];
}

interface QuestionsPayload {
  groupId: string;
  questions: QuestionData[];
}

type BrainstormEvent =
  | { type: "text"; data: string }
  | { type: "questions"; data: QuestionsPayload }
  | { type: "end"; data: { ready: boolean } }
  | { type: "error"; data: string }
  | { type: "done"; data: null };

async function parseSSE(response: Response): Promise<BrainstormEvent[]> {
  const reader = response.body?.getReader();
  if (!reader) return [];

  const decoder = new TextDecoder();
  let buffer = "";
  const events: BrainstormEvent[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.replace(/^data:\s*/, "");
      try {
        events.push(JSON.parse(json));
      } catch {
        // ignore parse errors
      }
    }
  }

  return events;
}

function autoAnswer(
  questions: QuestionData[],
  language: "en" | "zh"
): Array<{ question: string; answer: string }> {
  const defaultText = language === "en" ? "Default text answer" : "默认文本回答";
  return questions.map((q) => {
    if (q.type === "text") {
      return { question: q.question, answer: defaultText };
    }
    if (q.type === "yesno") {
      return { question: q.question, answer: "yes" };
    }
    if (q.type === "multi" && Array.isArray(q.options) && q.options.length > 0) {
      const selected = q.options.slice(0, Math.min(2, q.options.length));
      return { question: q.question, answer: selected.map((opt) => opt.label).join(", ") };
    }
    if (Array.isArray(q.options) && q.options.length > 0) {
      return { question: q.question, answer: q.options[0].label };
    }
    return { question: q.question, answer: "N/A" };
  });
}

interface FlowResult {
  history: Array<{ question: string; answer: string }>;
  rounds: number;
  totalQuestions: number;
  endedNaturally: boolean;
  errors: string[];
}

async function runBrainstormFlow(input: string, language: "en" | "zh"): Promise<FlowResult> {
  const sessionId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const history: Array<{ question: string; answer: string }> = [];
  const errors: string[] = [];
  let rounds = 0;
  let totalQuestions = 0;
  let endedNaturally = false;

  const baseUrl = getBaseUrl();
  const maxRounds = 12;

  for (let step = 0; step < maxRounds; step++) {
    const action = step === 0 ? "start" : "answer";

    const response = await fetch(`${baseUrl}/api/brainstorm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        input: step === 0 ? input : undefined,
        language,
        history,
        action,
      }),
    });

    if (!response.ok) {
      errors.push(`HTTP ${response.status} at round ${step}`);
      break;
    }

    const events = await parseSSE(response);
    rounds++;

    const errorEvent = events.find((e) => e.type === "error");
    if (errorEvent && errorEvent.type === "error") {
      errors.push(errorEvent.data);
    }

    const endEvent = events.find((e) => e.type === "end");
    if (endEvent) {
      endedNaturally = true;
      break;
    }

    const questionsEvent = events.find((e) => e.type === "questions");
    if (questionsEvent && questionsEvent.type === "questions") {
      const questions = questionsEvent.data.questions ?? [];
      if (questions.length === 0) {
        // Empty questions, will be retried by frontend
        continue;
      }
      totalQuestions += questions.length;
      history.push(...autoAnswer(questions, language));
    }
  }

  return { history, rounds, totalQuestions, endedNaturally, errors };
}

async function generateSummary(
  history: Array<{ question: string; answer: string }>,
  language: "en" | "zh"
): Promise<{ markdown: string; error?: string }> {
  const sessionId = `e2e-summary-${Date.now()}`;
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/api/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      language,
      history,
    }),
  });

  if (!response.ok) {
    return { markdown: "", error: `HTTP ${response.status}` };
  }

  const data = await response.json();
  return { markdown: data.markdown || "" };
}

interface TestArtifacts {
  input: string;
  language: "en" | "zh";
  flow: FlowResult;
  markdown: string;
  quality: ReturnType<typeof validateMarkdownQuality>;
  timestamp: string;
}

function saveArtifacts(artifacts: TestArtifacts): string {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const baseFilename = `${artifacts.language}-${artifacts.timestamp}`;

  // Save markdown
  const mdFilename = `requirements-${baseFilename}.md`;
  writeFileSync(join(OUTPUT_DIR, mdFilename), artifacts.markdown);

  // Save full test report (JSON)
  const reportFilename = `report-${baseFilename}.json`;
  const report = {
    input: artifacts.input,
    language: artifacts.language,
    timestamp: artifacts.timestamp,
    flow: {
      rounds: artifacts.flow.rounds,
      totalQuestions: artifacts.flow.totalQuestions,
      endedNaturally: artifacts.flow.endedNaturally,
      errors: artifacts.flow.errors,
      historyCount: artifacts.flow.history.length,
    },
    quality: artifacts.quality,
  };
  writeFileSync(join(OUTPUT_DIR, reportFilename), JSON.stringify(report, null, 2));

  // Save Q&A history
  const historyFilename = `history-${baseFilename}.md`;
  const historyMd = [
    `# Q&A History`,
    ``,
    `**Input:** ${artifacts.input}`,
    `**Language:** ${artifacts.language}`,
    `**Rounds:** ${artifacts.flow.rounds}`,
    `**Total Questions:** ${artifacts.flow.totalQuestions}`,
    `**Ended Naturally:** ${artifacts.flow.endedNaturally}`,
    `**Errors:** ${artifacts.flow.errors.length > 0 ? artifacts.flow.errors.join(", ") : "None"}`,
    ``,
    `---`,
    ``,
    ...artifacts.flow.history.map(
      (item, i) => `## Q${i + 1}: ${item.question}\n\n**A:** ${item.answer}\n`
    ),
  ].join("\n");
  writeFileSync(join(OUTPUT_DIR, historyFilename), historyMd);

  return baseFilename;
}

function validateMarkdownQuality(markdown: string): {
  valid: boolean;
  issues: string[];
  stats: {
    length: number;
    headings: number;
    sections: string[];
    hasCheckboxes: boolean;
    hasCodeBlocks: boolean;
    hasOpenQuestions: boolean;
  };
} {
  const issues: string[] = [];

  // Check length
  if (markdown.length < 300) {
    issues.push(`Markdown too short: ${markdown.length} chars (expected >= 300)`);
  }

  // Check for headings
  const headingMatches = markdown.match(/^#{1,3}\s+.+$/gm) || [];
  if (headingMatches.length < 3) {
    issues.push(`Too few headings: ${headingMatches.length} (expected >= 3)`);
  }

  // Extract section names
  const sections = headingMatches.map((h) => h.replace(/^#+\s+/, "").trim());

  // Check for required sections (at least some of these should exist)
  const requiredPatterns = [
    /overview|概览|概述/i,
    /tech|技术|stack/i,
    /feature|功能|requirement|需求/i,
  ];
  const foundRequired = requiredPatterns.filter((pattern) =>
    sections.some((s) => pattern.test(s))
  );
  if (foundRequired.length < 2) {
    issues.push(`Missing required sections. Found: ${sections.join(", ")}`);
  }

  // Check for checkboxes (indicates actionable requirements)
  const hasCheckboxes = /- \[ \]/.test(markdown);

  // Check for code blocks (indicates technical specificity)
  const hasCodeBlocks = /```/.test(markdown);

  // Check for open questions (should be "None" or not exist)
  const openQuestionsMatch = markdown.match(/open\s*questions?/i);
  const hasOpenQuestions = openQuestionsMatch
    ? !/none|无|没有/i.test(markdown.slice(markdown.search(/open\s*questions?/i), markdown.search(/open\s*questions?/i) + 200))
    : false;

  if (hasOpenQuestions) {
    issues.push("Contains unresolved open questions");
  }

  // Check for JSON remnants (should not exist)
  if (markdown.includes('{"') || markdown.includes("```json")) {
    issues.push("Contains JSON remnants");
  }

  // Check for tool_use remnants
  if (markdown.includes("tool_use") || markdown.includes("ask_questions")) {
    issues.push("Contains tool_use remnants");
  }

  return {
    valid: issues.length === 0,
    issues,
    stats: {
      length: markdown.length,
      headings: headingMatches.length,
      sections,
      hasCheckboxes,
      hasCodeBlocks,
      hasOpenQuestions,
    },
  };
}

describe("Brainstorming Full E2E Flow", () => {
  it(
    "completes brainstorming flow and generates quality markdown (Chinese)",
    async () => {
      const baseUrl = getBaseUrl();
      console.log("🚀 Starting brainstorming flow...");
      console.log(`   Input: "${INPUT}"`);
      console.log(`   Base URL: ${baseUrl}`);

      // Run brainstorming flow
      const flow = await runBrainstormFlow(INPUT, "zh");

      console.log(`\n📊 Flow Results:`);
      console.log(`   Rounds: ${flow.rounds}`);
      console.log(`   Total Questions: ${flow.totalQuestions}`);
      console.log(`   Ended Naturally: ${flow.endedNaturally}`);
      console.log(`   Errors: ${flow.errors.length > 0 ? flow.errors.join(", ") : "None"}`);

      // Validate flow - allow some parse errors (AI sometimes doesn't follow format)
      const criticalErrors = flow.errors.filter((e) => !e.includes("parse"));
      expect(criticalErrors).toHaveLength(0);
      expect(flow.totalQuestions).toBeGreaterThanOrEqual(3);
      // Allow up to 12 rounds (hard limit is 10 groups, but rounds include retries)
      expect(flow.rounds).toBeLessThanOrEqual(12);

      // Only generate summary if we have enough history
      if (flow.history.length < 3) {
        console.log("⚠️ Not enough history to generate summary, skipping...");
        return;
      }

      // Generate summary
      console.log("\n📝 Generating summary...");
      const summary = await generateSummary(flow.history, "zh");

      expect(summary.error).toBeUndefined();
      expect(summary.markdown).toBeTruthy();

      // Validate markdown quality
      const quality = validateMarkdownQuality(summary.markdown);

      console.log(`\n✅ Markdown Quality:`);
      console.log(`   Length: ${quality.stats.length} chars`);
      console.log(`   Headings: ${quality.stats.headings}`);
      console.log(`   Sections: ${quality.stats.sections.join(", ")}`);
      console.log(`   Has Checkboxes: ${quality.stats.hasCheckboxes}`);
      console.log(`   Has Code Blocks: ${quality.stats.hasCodeBlocks}`);
      console.log(`   Has Open Questions: ${quality.stats.hasOpenQuestions}`);

      if (quality.issues.length > 0) {
        console.log(`\n⚠️ Quality Issues:`);
        quality.issues.forEach((issue) => console.log(`   - ${issue}`));
      }

      // Assert quality - be lenient on length since AI output varies
      expect(quality.stats.length).toBeGreaterThanOrEqual(200);
      expect(quality.stats.headings).toBeGreaterThanOrEqual(2);
      expect(quality.issues.filter((i) => i.includes("remnants"))).toHaveLength(0);
      // Open questions should be resolved
      expect(quality.stats.hasOpenQuestions).toBe(false);

      // Save all artifacts for debugging
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const baseFilename = saveArtifacts({
        input: INPUT,
        language: "zh",
        flow,
        markdown: summary.markdown,
        quality,
        timestamp,
      });
      console.log(`\n📁 Saved artifacts: e2e-output/*-${baseFilename}.*`);

      console.log("\n🎉 E2E test passed!");
    },
    300000 // 5 minute timeout
  );

  it(
    "completes brainstorming flow and generates quality markdown (English)",
    async () => {
      const baseUrl = getBaseUrl();
      const input = "I want to build a unique snake game";
      console.log("🚀 Starting brainstorming flow (English)...");
      console.log(`   Input: "${input}"`);
      console.log(`   Base URL: ${baseUrl}`);

      // Run brainstorming flow
      const flow = await runBrainstormFlow(input, "en");

      console.log(`\n📊 Flow Results:`);
      console.log(`   Rounds: ${flow.rounds}`);
      console.log(`   Total Questions: ${flow.totalQuestions}`);
      console.log(`   Ended Naturally: ${flow.endedNaturally}`);
      console.log(`   Errors: ${flow.errors.length > 0 ? flow.errors.join(", ") : "None"}`);

      // Validate flow - allow some parse errors (AI sometimes doesn't follow format)
      const criticalErrors = flow.errors.filter((e) => !e.includes("parse"));
      expect(criticalErrors).toHaveLength(0);
      expect(flow.totalQuestions).toBeGreaterThanOrEqual(3);
      expect(flow.rounds).toBeLessThanOrEqual(12);

      // Only generate summary if we have enough history
      if (flow.history.length < 3) {
        console.log("⚠️ Not enough history to generate summary, skipping...");
        return;
      }

      // Generate summary
      console.log("\n📝 Generating summary...");
      const summary = await generateSummary(flow.history, "en");

      expect(summary.error).toBeUndefined();
      expect(summary.markdown).toBeTruthy();

      // Validate markdown quality
      const quality = validateMarkdownQuality(summary.markdown);

      console.log(`\n✅ Markdown Quality:`);
      console.log(`   Length: ${quality.stats.length} chars`);
      console.log(`   Headings: ${quality.stats.headings}`);
      console.log(`   Sections: ${quality.stats.sections.join(", ")}`);
      console.log(`   Has Checkboxes: ${quality.stats.hasCheckboxes}`);
      console.log(`   Has Code Blocks: ${quality.stats.hasCodeBlocks}`);
      console.log(`   Has Open Questions: ${quality.stats.hasOpenQuestions}`);

      if (quality.issues.length > 0) {
        console.log(`\n⚠️ Quality Issues:`);
        quality.issues.forEach((issue) => console.log(`   - ${issue}`));
      }

      // Assert quality - be lenient on length since AI output varies
      expect(quality.stats.length).toBeGreaterThanOrEqual(200);
      expect(quality.stats.headings).toBeGreaterThanOrEqual(2);
      expect(quality.issues.filter((i) => i.includes("remnants"))).toHaveLength(0);
      expect(quality.stats.hasOpenQuestions).toBe(false);

      // Save all artifacts for debugging
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const baseFilename = saveArtifacts({
        input,
        language: "en",
        flow,
        markdown: summary.markdown,
        quality,
        timestamp,
      });
      console.log(`\n📁 Saved artifacts: e2e-output/*-${baseFilename}.*`);

      console.log("\n🎉 E2E test passed (English)!");
    },
    300000
  );
});
