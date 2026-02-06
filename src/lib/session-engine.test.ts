import { describe, expect, it } from "vitest";
import type { Answer, Question, QuestionGroup } from "@/types/question";
import { buildGroupSignature, isConfirmationGroup, sanitizeGuideText } from "@/lib/session-engine";

describe("session-engine helpers", () => {
  it("sanitizeGuideText removes completion hints", () => {
    const raw = "We have enough information. You can start implementing.";
    expect(sanitizeGuideText(raw)).not.toContain("enough information");
    expect(sanitizeGuideText(raw)).not.toContain("implementing");
  });

  it("buildGroupSignature is stable across casing/whitespace", () => {
    const base: Question[] = [
      {
        id: "q1",
        type: "single",
        title: "  Title ",
        question: " What is it? ",
        options: [{ id: "a", label: " A " }],
      },
    ];
    const variant: Question[] = [
      {
        id: "q1",
        type: "single",
        title: "title",
        question: "what is it?",
        options: [{ id: "a", label: "a" }],
      },
    ];
    expect(buildGroupSignature(base)).toBe(buildGroupSignature(variant));
  });

  it("isConfirmationGroup detects a yes confirmation answer", () => {
    const group: QuestionGroup = {
      id: "g1",
      createdAt: new Date().toISOString(),
      questions: [
        {
          id: "q_confirm",
          type: "yesno",
          title: "Confirm",
          question: "Is the above summary correct?",
        },
      ],
    };
    const answers: Answer[] = [{ questionId: "q_confirm", value: true }];
    expect(isConfirmationGroup(group, answers)).toBe(true);
  });
});

