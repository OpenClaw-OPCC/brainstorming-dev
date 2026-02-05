import type { Answer, Question } from "@/types/question";

export const OTHER_OPTION_ID = "__other__";

export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateQuestion(question: Question, answer?: Answer): boolean {
  if (!answer) return false;

  if (question.type === "text") {
    return typeof answer.value === "string" && answer.value.trim().length > 0;
  }

  if (question.type === "yesno") {
    return typeof answer.value === "boolean";
  }

  if (question.type === "slider") {
    return typeof answer.value === "number";
  }

  if (question.type === "single") {
    if (typeof answer.value !== "string" || answer.value.length === 0) return false;
    const selectedOther = answer.value === OTHER_OPTION_ID;
    if (selectedOther) {
      return typeof answer.customText === "string" && answer.customText.trim().length > 0;
    }
    return true;
  }

  if (question.type === "multi") {
    if (!Array.isArray(answer.value)) return false;
    const values = answer.value;
    const min = question.minSelections ?? 1;
    const max = question.maxSelections ?? Number.POSITIVE_INFINITY;
    if (values.length < min || values.length > max) return false;

    const hasOther = values.includes(OTHER_OPTION_ID);
    if (hasOther) {
      return typeof answer.customText === "string" && answer.customText.trim().length > 0;
    }
    return true;
  }

  return false;
}

export function validateGroup(questions: Question[], answers: Answer[]): ValidationResult {
  const missing: string[] = [];
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  questions.forEach((question) => {
    const answer = answerMap.get(question.id);
    if (!validateQuestion(question, answer)) {
      missing.push(question.id);
    }
  });

  return { valid: missing.length === 0, missing };
}
