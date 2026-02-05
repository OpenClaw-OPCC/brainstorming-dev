import type { Answer, Question } from "@/types/question";
import { OTHER_OPTION_ID } from "@/lib/validation";

export function applyOptionSelection(question: Question, answer: Answer | undefined, optionId: string): Answer {
  if (question.type === "yesno") {
    const normalized = optionId.toLowerCase();
    const truthy = ["yes", "true", "1", "y", "是"].includes(normalized);
    const falsy = ["no", "false", "0", "n", "否"].includes(normalized);
    return { questionId: question.id, value: truthy ? true : falsy ? false : optionId === "yes" };
  }

  if (question.type === "single") {
    return {
      questionId: question.id,
      value: optionId,
      customText: optionId === OTHER_OPTION_ID ? answer?.customText : undefined,
    };
  }

  if (question.type === "multi") {
    const current = Array.isArray(answer?.value)
      ? answer?.value
      : typeof answer?.value === "string"
        ? [answer.value]
        : [];
    const maxSelections = question.maxSelections ?? Number.POSITIVE_INFINITY;
    const exists = current.includes(optionId);
    let next = current;
    if (exists) {
      next = current.filter((value) => value !== optionId);
    } else if (current.length < maxSelections) {
      next = [...current, optionId];
    }
    const hasOther = next.includes(OTHER_OPTION_ID);
    return {
      questionId: question.id,
      value: next,
      customText: hasOther ? answer?.customText : undefined,
    };
  }

  return answer ?? { questionId: question.id, value: optionId };
}
