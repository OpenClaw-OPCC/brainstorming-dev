"use client";

import { useMemo, useState } from "react";
import type { Answer, QuestionGroup } from "@/types/question";
import { validateGroup } from "@/lib/validation";
import { OTHER_OPTION_ID } from "@/lib/validation";
import { applyOptionSelection } from "@/lib/answer-utils";
import { useKeyboard } from "@/hooks/useKeyboard";
import { QuestionTabs } from "./QuestionTabs";
import { OptionList } from "./OptionList";
import { SubmitBar } from "./SubmitBar";

interface QuestionCardProps {
  group: QuestionGroup;
  answers: Answer[];
  onAnswerChange: (answer: Answer) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitLabel: string;
  nextLabel: string;
  backLabel: string;
  isLoading?: boolean;
}

export function QuestionCard({
  group,
  answers,
  onAnswerChange,
  onSubmit,
  onBack,
  submitLabel,
  nextLabel,
  backLabel,
  isLoading = false,
}: QuestionCardProps) {
  const [activeIndexByGroup, setActiveIndexByGroup] = useState<Record<string, number>>({});
  const [tabAttentionByGroup, setTabAttentionByGroup] = useState<Record<string, { index: number; nonce: number }>>({});
  const activeIndex = activeIndexByGroup[group.id] ?? 0;

  const question = group.questions[activeIndex];

  const answer = useMemo(
    () => answers.find((item) => item.questionId === question.id),
    [answers, question.id],
  );

  const validation = useMemo(() => validateGroup(group.questions, answers), [group.questions, answers]);

  const firstMissingIndex = useMemo(() => {
    if (validation.missing.length === 0) return -1;
    const missingSet = new Set(validation.missing);
    return group.questions.findIndex((q) => missingSet.has(q.id));
  }, [group.questions, validation.missing]);

  const tabAttention = tabAttentionByGroup[group.id];
  const triggerTabAttention = (index: number) => {
    setTabAttentionByGroup((prev) => ({
      ...prev,
      [group.id]: { index, nonce: Date.now() },
    }));
  };

  const optionIds = useMemo(() => {
    if (question.type === "yesno") {
      if (question.options && question.options.length >= 2) {
        return question.options.slice(0, 2).map((opt) => opt.id);
      }
      return ["yes", "no"];
    }
    if (!question.options) return [];
    const ids = question.options.map((opt) => opt.id);
    if (question.allowOther) ids.push(OTHER_OPTION_ID);
    return ids;
  }, [question]);

  const handleTabChange = (index: number) => {
    setActiveIndexByGroup((prev) => ({ ...prev, [group.id]: index }));
  };

  const handlePrimaryAction = () => {
    // If the group is incomplete, take the user to the first missing question instead of disabling the button.
    if (!validation.valid) {
      const targetIndex = firstMissingIndex >= 0 ? firstMissingIndex : activeIndex;
      triggerTabAttention(targetIndex);
      handleTabChange(targetIndex);
      return;
    }

    onSubmit();
  };

  useKeyboard({
    enabled: Boolean(group),
    optionIds,
    onSelectOption: (optionId) => {
      if (!optionId) return;
      onAnswerChange(applyOptionSelection(question, answer, optionId));
    },
    onSubmit: handlePrimaryAction,
    onBack,
  });

  return (
    <div className="relative flex w-full flex-col gap-4 rounded-[var(--corner-radius-large)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)]">
      <QuestionTabs
        questions={group.questions}
        activeIndex={activeIndex}
        onChange={handleTabChange}
        missingQuestionIds={new Set(validation.missing)}
        attention={tabAttention}
      />
      <div
        key={question.id}
        className={`oc-question-enter flex flex-col gap-4 px-4 pb-4 ${isLoading ? "opacity-0" : "opacity-100"}`}
      >
        <div>
          <h2 className="text-sm font-semibold">{question.question}</h2>
        </div>
        <OptionList question={question} answer={answer} onChange={onAnswerChange} />
        <SubmitBar
          onSubmit={handlePrimaryAction}
          onBack={onBack}
          submitLabel={validation.valid ? submitLabel : nextLabel}
          backLabel={backLabel}
          isLoading={isLoading}
        />
      </div>
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 rounded-[var(--corner-radius-large)] bg-[var(--app-secondary-background)]" />
      ) : null}
    </div>
  );
}
