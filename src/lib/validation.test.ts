import { describe, expect, it } from "vitest";
import { validateGroup } from "@/lib/validation";
import type { Question, Answer } from "@/types/question";
import { OTHER_OPTION_ID } from "@/lib/validation";

const baseQuestion: Question = {
  id: "q1",
  type: "single",
  title: "Title",
  question: "Question?",
  options: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ],
};

describe("validateGroup", () => {
  it("fails when required answer missing", () => {
    const result = validateGroup([baseQuestion], []);
    expect(result.valid).toBe(false);
  });

  it("accepts single choice", () => {
    const answers: Answer[] = [{ questionId: "q1", value: "a" }];
    const result = validateGroup([baseQuestion], answers);
    expect(result.valid).toBe(true);
  });

  it("requires custom text when Other selected", () => {
    const question: Question = { ...baseQuestion, allowOther: true, type: "multi" };
    const answers: Answer[] = [{ questionId: "q1", value: [OTHER_OPTION_ID] }];
    const result = validateGroup([question], answers);
    expect(result.valid).toBe(false);
  });

  it("requires custom text even when Other is combined with other selections", () => {
    const question: Question = { ...baseQuestion, allowOther: true, type: "multi" };
    const answers: Answer[] = [{ questionId: "q1", value: [OTHER_OPTION_ID, "a"] }];
    const result = validateGroup([question], answers);
    expect(result.valid).toBe(false);
  });

  it("accepts custom text when Other selected", () => {
    const question: Question = { ...baseQuestion, allowOther: true, type: "multi" };
    const answers: Answer[] = [
      { questionId: "q1", value: [OTHER_OPTION_ID], customText: "custom" },
    ];
    const result = validateGroup([question], answers);
    expect(result.valid).toBe(true);
  });
});
