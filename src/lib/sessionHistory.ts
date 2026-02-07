import type { Session } from "@/types/session";
import { clampHistoryAnswer, clampHistoryQuestion } from "@/lib/apiClamp";
import { MAX_HISTORY_ITEMS } from "@/lib/apiLimits";

export interface HistoryItem {
  question: string;
  answer: string;
}

/**
 * Build a bounded, display-safe Q&A history for summary generation.
 *
 * - Includes all questions across all groups, in group order.
 * - Uses stored answers when present; formats other-text as "<value> (<customText>)".
 * - Clamps text to protect the summary prompt.
 * - Keeps the last MAX_HISTORY_ITEMS entries.
 */
export function buildSessionHistory(session: Session): HistoryItem[] {
  const items = session.questionGroups.flatMap((group) =>
    group.questions.map((question) => {
      const answer = session.answers.find((a) => a.questionId === question.id);
      const value = answer?.customText
        ? `${String(answer.value ?? "")} (${answer.customText})`
        : String(answer?.value ?? "");

      return {
        question: clampHistoryQuestion(question.question),
        answer: clampHistoryAnswer(value),
      };
    }),
  );

  return items.slice(-MAX_HISTORY_ITEMS);
}
