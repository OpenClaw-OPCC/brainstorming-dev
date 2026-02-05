import { describe, expect, it } from "vitest";
import { normalizeQuestion, normalizeSession } from "@/lib/questions";
import { OTHER_OPTION_ID } from "@/lib/validation";
import type { Session } from "@/types/session";
import type { Question } from "@/types/question";

describe("question normalization", () => {
  it("normalizes multiple_choice to multi and handles other option", () => {
    const raw = normalizeQuestion({
      id: "q1",
      type: "multiple_choice" as unknown as Question["type"],
      title: "创新方向",
      question: "你想在哪些方面与众不同？",
      options: [
        { id: "mechanics", label: "玩法" },
        { id: "other", label: "Other" },
      ],
      allowOther: false,
    });

    expect(raw.type).toBe("multi");
    expect(raw.allowOther).toBe(true);
    expect(raw.options?.some((opt) => opt.id === "other")).toBe(false);
  });

  it("normalizes multi-choice variants and allow_other", () => {
    const raw = normalizeQuestion({
      id: "q2",
      type: "multi-choice" as unknown as Question["type"],
      title: "方向",
      question: "请选择（可多选）",
      options: [
        { id: "a", label: "A" },
        { label: "Other (please specify)" } as unknown as { id: string; label: string },
      ],
      allowOther: false,
      allow_other: true as unknown as boolean,
    } as Question);

    expect(raw.type).toBe("multi");
    expect(raw.allowOther).toBe(true);
    expect(raw.options?.length).toBe(1);
  });

  it("normalizes answers for other selections", () => {
    const session: Session = {
      id: "s1",
      title: "test",
      initialInput: "我要一个与众不同的贪吃蛇",
      status: "active",
      language: "zh",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questionGroups: [
        {
          id: "g1",
          createdAt: new Date().toISOString(),
          questions: [
            {
              id: "q1",
              type: "single",
              title: "创新方向",
              question: "你想在哪些方面与众不同？",
              options: [{ id: "other", label: "Other" }],
              allowOther: false,
            },
          ],
        },
      ],
      answers: [
        {
          questionId: "q1",
          value: "other",
          customText: "自定义方向",
        },
      ],
    };

    const normalized = normalizeSession(session);
    expect(normalized.answers[0].value).toBe(OTHER_OPTION_ID);
  });

  it("infers multi-select from question text", () => {
    const raw = normalizeQuestion({
      id: "q2",
      type: "single",
      title: "创新方向",
      question: "你想在哪些方面与众不同？（可多选）",
      options: [{ id: "a", label: "玩法" }],
    });
    expect(raw.type).toBe("multi");
  });
});
