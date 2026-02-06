import { describe, expect, it } from "vitest";
import { BrainstormRequestSchema, MAX_ANSWER_LENGTH, MAX_INPUT_LENGTH } from "./schema";

describe("BrainstormRequestSchema", () => {
  it("accepts a valid start request", () => {
    const result = BrainstormRequestSchema.safeParse({
      sessionId: "session_1",
      input: "Build a todo app",
      language: "en",
      history: [],
      action: "start",
    });
    expect(result.success).toBe(true);
  });

  it("rejects start requests without input", () => {
    const result = BrainstormRequestSchema.safeParse({
      sessionId: "session_1",
      language: "en",
      history: [],
      action: "start",
    });
    expect(result.success).toBe(false);
  });

  it("accepts answer requests without input", () => {
    const result = BrainstormRequestSchema.safeParse({
      sessionId: "session_1",
      language: "en",
      history: [],
      action: "answer",
    });
    expect(result.success).toBe(true);
  });

  it("enforces MAX_INPUT_LENGTH", () => {
    const result = BrainstormRequestSchema.safeParse({
      sessionId: "session_1",
      input: "a".repeat(MAX_INPUT_LENGTH + 1),
      language: "en",
      history: [],
      action: "start",
    });
    expect(result.success).toBe(false);
  });

  it("enforces MAX_ANSWER_LENGTH for multi answers", () => {
    const result = BrainstormRequestSchema.safeParse({
      sessionId: "session_1",
      input: "x",
      language: "en",
      history: [
        { question: "Q", answer: ["a".repeat(MAX_ANSWER_LENGTH + 1)] },
      ],
      action: "start",
    });
    expect(result.success).toBe(false);
  });
});

