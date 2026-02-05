"use client";

import type { Question } from "@/types/question";

interface QuestionTabsProps {
  questions: Question[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function QuestionTabs({ questions, activeIndex, onChange }: QuestionTabsProps) {
  if (questions.length <= 1) return null;
  return (
    <div className="flex border-b border-[var(--app-border-color)]">
      {questions.map((question, index) => (
        <button
          key={question.id}
          className={`flex-1 px-3 py-2 text-left text-xs font-semibold ${
            index === activeIndex
              ? "border-b-2 border-[var(--app-claude-orange)] text-[var(--app-primary-foreground)]"
              : "text-[var(--app-secondary-foreground)]"
          }`}
          onClick={() => onChange(index)}
        >
          {question.title}
        </button>
      ))}
    </div>
  );
}
