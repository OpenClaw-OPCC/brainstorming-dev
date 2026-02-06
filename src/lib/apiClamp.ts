import { MAX_ANSWER_LENGTH, MAX_QUESTION_LENGTH } from "@/lib/apiLimits";

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
}

export function clampHistoryQuestion(value: string) {
  return truncateText(value, MAX_QUESTION_LENGTH);
}

export function clampHistoryAnswer(value: string) {
  return truncateText(value, MAX_ANSWER_LENGTH);
}

