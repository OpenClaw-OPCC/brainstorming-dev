"use client";

import type { Question } from "@/types/question";

interface QuestionTabsProps {
  questions: Question[];
  activeIndex: number;
  onChange: (index: number) => void;
  missingQuestionIds?: Set<string>;
  attention?: { index: number; nonce: number };
}

export function QuestionTabs({
  questions,
  activeIndex,
  onChange,
  missingQuestionIds,
  attention,
}: QuestionTabsProps) {
  if (questions.length <= 1) return null;

  return (
    <div className="flex border-b border-[var(--app-border-color)]">
      {questions.map((question, index) => {
        const isMissing = Boolean(missingQuestionIds?.has(question.id));
        const isAttention = attention?.index === index;
        const attentionKey = isAttention ? attention?.nonce : 0;

        return (
          <button
            key={question.id}
            className={`flex-1 px-3 py-2 text-left text-xs font-semibold transition-colors ${
              index === activeIndex
                ? "border-b-2 border-[var(--app-claude-orange)] text-[var(--app-primary-foreground)]"
                : "text-[var(--app-secondary-foreground)]"
            }`}
            onClick={() => onChange(index)}
          >
            <span
              key={`${question.id}-${attentionKey}`}
              className={isAttention ? "oc-tab-attention" : ""}
            >
              {question.title}
              {isMissing ? (
                <span
                  className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--app-claude-orange)] align-middle"
                  aria-label="Unanswered"
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
