import { describe, expect, it } from "vitest";

const INPUT = "我要一个与众不同的贪吃蛇";
const baseUrl = process.env.E2E_BASE_URL;
const mockEnabled = process.env.MOCK_BRAINSTORM === "1";

interface QuestionOption {
  id: string;
  label: string;
}

interface QuestionData {
  type: string;
  question: string;
  options?: QuestionOption[];
}

type BrainstormEvent = { type: string; data?: unknown };

async function collectEvents(response: Response): Promise<BrainstormEvent[]> {
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
        // ignore
      }
    }
  }

  return events;
}

function buildHistoryFromQuestions(questions: QuestionData[]) {
  return questions.map((q) => {
    if (q.type === "text") {
      return { question: q.question, answer: INPUT };
    }
    if (q.type === "multi" && Array.isArray(q.options)) {
      const values = q.options.slice(0, 2).map((opt) => opt.label);
      return { question: q.question, answer: values.join(", ") };
    }
    if (Array.isArray(q.options) && q.options.length > 0) {
      return { question: q.question, answer: q.options[0].label };
    }
    return { question: q.question, answer: "N/A" };
  });
}

describe("Brainstorming E2E (mock)", () => {
  if (!baseUrl || !mockEnabled) {
    it.skip("E2E flow requires E2E_BASE_URL and MOCK_BRAINSTORM=1", () => {});
    return;
  }

  it("runs from initial input to summary markdown", async () => {
    let history: Array<{ question: string; answer: string }> = [];
    let totalQuestions = 0;

    for (let step = 0; step < 6; step += 1) {
      const action = step === 0 ? "start" : "answer";
      const response = await fetch(`${baseUrl}/api/brainstorm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "e2e-test",
          input: INPUT,
          language: "zh",
          history,
          action,
        }),
      });

      expect(response.ok).toBe(true);

      const events = await collectEvents(response);
      const questionsEvent = events.find((event) => event.type === "questions");
      const endEvent = events.find((event) => event.type === "end");

      if (questionsEvent) {
        const questions = questionsEvent.data.questions ?? [];
        totalQuestions += questions.length;
        history = [...history, ...buildHistoryFromQuestions(questions)];
        continue;
      }

      if (endEvent) break;
    }

    expect(totalQuestions).toBeGreaterThan(6);

    const summaryResponse = await fetch(`${baseUrl}/api/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "e2e-test",
        language: "zh",
        history,
      }),
    });

    expect(summaryResponse.ok).toBe(true);
    const summary = await summaryResponse.json();
    expect(summary.markdown).toContain("#");
  });
});
