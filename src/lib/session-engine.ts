import type { Answer, Question, QuestionGroup } from "@/types/question";
import { validateGroup } from "@/lib/validation";

export const COMPLETION_PHRASES = [
  /可以开始实现/gi,
  /准备结束/gi,
  /结束头脑风暴/gi,
  /已经收集足够/gi,
  /可以开始/gi,
  /ready to end/gi,
  /end the brainstorming/gi,
  /we have enough information/gi,
  /you can start implementing/gi,
];

export const CONFIRMATION_PATTERNS = [
  /以上需求.*正确/gi,
  /需求总结.*正确/gi,
  /确认.*需求/gi,
  /confirm.*requirements/gi,
  /is the above.*correct/gi,
  /summary.*correct/gi,
];

export const SOFT_GROUP_LIMIT = 6;
export const HARD_GROUP_LIMIT = 10;

export function sanitizeGuideText(text: string) {
  return COMPLETION_PHRASES.reduce((acc, pattern) => acc.replace(pattern, ""), text);
}

export function findFirstIncompleteGroup(groups: QuestionGroup[], answers: Answer[]) {
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    const result = validateGroup(
      group.questions,
      answers.filter((a) => group.questions.some((q) => q.id === a.questionId)),
    );
    if (!result.valid) return i;
  }
  return -1;
}

export function getAnswersForGroup(group: QuestionGroup | null, answers: Answer[]) {
  if (!group) return [];
  const ids = new Set(group.questions.map((q) => q.id));
  return answers.filter((a) => ids.has(a.questionId));
}

export function serializeAnswer(question: Question, answer: Answer): string {
  if (question.type === "multi" && Array.isArray(answer.value)) {
    const base = answer.value.join(", ");
    return answer.customText ? `${base} (${answer.customText})` : base;
  }
  if (typeof answer.value === "boolean") return answer.value ? "Yes" : "No";
  const base = String(answer.value ?? "");
  return answer.customText ? `${base} (${answer.customText})` : base;
}

export function buildGroupSignature(questions: Question[]) {
  return JSON.stringify(
    questions.map((question) => ({
      type: question.type,
      title: question.title.trim().toLowerCase(),
      question: question.question.trim().toLowerCase(),
      options: (question.options ?? []).map((opt) => opt.label.trim().toLowerCase()),
    })),
  );
}

export function isConfirmationQuestion(question: Question) {
  const text = `${question.title} ${question.question}`.toLowerCase();
  return CONFIRMATION_PATTERNS.some((pattern) => pattern.test(text));
}

function answerIsYes(question: Question, answer: Answer | undefined) {
  if (!answer) return false;
  if (typeof answer.value === "boolean") return answer.value;
  const raw = String(answer.value ?? "").toLowerCase();
  if (["yes", "true", "是", "正确", "完全正确"].some((value) => raw.includes(value))) return true;
  if (question.options) {
    const option = question.options.find((opt) => opt.id === answer.value);
    if (option) {
      const label = option.label.toLowerCase();
      if (["yes", "true", "是", "正确", "完全正确"].some((value) => label.includes(value))) return true;
    }
  }
  return false;
}

export function isConfirmationGroup(group: QuestionGroup, answers: Answer[]) {
  const relevant = group.questions.filter((q) => isConfirmationQuestion(q));
  if (relevant.length === 0) return false;
  return relevant.every((question) =>
    answerIsYes(question, answers.find((a) => a.questionId === question.id)),
  );
}

