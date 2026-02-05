"use client";

import type { Session } from "@/types/session";
import type { Answer, Question } from "@/types/question";
import { useI18n } from "@/hooks/useI18n";

function formatAnswer(question: Question, answer: Answer | undefined, yesLabel: string, noLabel: string) {
  if (!answer) return "-";
  if (Array.isArray(answer.value)) {
    const base = answer.value.join(", ");
    return answer.customText ? `${base} (${answer.customText})` : base;
  }
  if (typeof answer.value === "boolean") return answer.value ? yesLabel : noLabel;
  const base = String(answer.value ?? "");
  return answer.customText ? `${base} (${answer.customText})` : base;
}

export function HistoryDetail({ session }: { session: Session }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-4">
        <h2 className="text-lg font-semibold">{session.title}</h2>
        <p className="mt-2 text-sm text-[var(--app-secondary-foreground)]">
          {session.initialInput}
        </p>
      </div>

      {session.questionGroups.map((group) => (
        <div
          key={group.id}
          className="rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-4"
        >
          <div className="flex flex-col gap-3">
            {group.questions.map((question) => {
              const answer = session.answers.find((a) => a.questionId === question.id);
              return (
                <div key={question.id} className="border-b border-[var(--app-border-color)] pb-3 last:border-none last:pb-0">
                  <p className="text-sm font-semibold">{question.question}</p>
                  <p className="mt-1 text-xs text-[var(--app-secondary-foreground)]">
                    {formatAnswer(question, answer, t("session.yes"), t("session.no"))}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
