import { describe, expect, it } from "vitest";
import type { Session } from "@/types/session";
import { buildSessionHistory } from "@/lib/sessionHistory";

function makeSession(partial: Partial<Session>): Session {
  return {
    id: "s1",
    title: "",
    initialInput: "",
    status: "active",
    language: "en",
    createdAt: "",
    updatedAt: "",
    questionGroups: [],
    answers: [],
    ...partial,
  };
}

describe("buildSessionHistory", () => {
  it("formats other answers as value + (customText)", () => {
    const session = makeSession({
      questionGroups: [
        {
          id: "g1",
          title: "",
          createdAt: "",
          questions: [
            {
              id: "q1",
              title: "T1",
              question: "Question?",
              type: "single",
              options: [{ id: "a", label: "A" }],
              allowOther: true,
            },
          ],
        },
      ],
      answers: [{ questionId: "q1", value: "__other__", customText: "My answer" }],
    });

    const history = buildSessionHistory(session);
    expect(history).toHaveLength(1);
    expect(history[0]?.answer).toContain("My answer");
  });

  it("returns empty answer string when unanswered", () => {
    const session = makeSession({
      questionGroups: [
        {
          id: "g1",
          title: "",
          createdAt: "",
          questions: [
            {
              id: "q1",
              title: "T1",
              question: "Question?",
              type: "text",
            },
          ],
        },
      ],
      answers: [],
    });

    const history = buildSessionHistory(session);
    expect(history).toHaveLength(1);
    expect(history[0]?.answer).toBe("");
  });
});
