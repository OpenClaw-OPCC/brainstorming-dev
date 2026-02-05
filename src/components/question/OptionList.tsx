"use client";

import type { Answer, Question } from "@/types/question";
import { OTHER_OPTION_ID } from "@/lib/validation";
import { applyOptionSelection } from "@/lib/answer-utils";
import { OtherInput } from "./OtherInput";
import { useI18n } from "@/hooks/useI18n";

interface OptionListProps {
  question: Question;
  answer?: Answer;
  onChange: (answer: Answer) => void;
}

export function OptionList({ question, answer, onChange }: OptionListProps) {
  const { t } = useI18n();
  if (question.type === "text") {
    return (
      <textarea
        className="min-h-[100px] w-full resize-none rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] bg-[var(--app-tertiary-background)] p-2 text-sm"
        value={(answer?.value as string) ?? ""}
        onChange={(event) => onChange({ questionId: question.id, value: event.target.value })}
      />
    );
  }

  if (question.type === "slider") {
    const min = question.min ?? 1;
    const max = question.max ?? 10;
    const value = typeof answer?.value === "number" ? answer.value : min;
    return (
      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={question.step ?? 1}
          value={value}
          onChange={(event) =>
            onChange({ questionId: question.id, value: Number(event.target.value) })
          }
        />
        <div className="text-xs text-[var(--app-secondary-foreground)]">{value}</div>
      </div>
    );
  }

  const options = [...(question.options ?? [])];
  if (question.allowOther) {
    options.push({ id: OTHER_OPTION_ID, label: t("session.other") });
  }

  const isMulti = question.type === "multi";
  const values = isMulti
    ? (Array.isArray(answer?.value) ? (answer?.value as string[]) : [])
    : typeof answer?.value === "string"
      ? [answer.value]
      : [];

  const toggle = (optionId: string) => {
    onChange(applyOptionSelection(question, answer, optionId));
  };

  const isOtherSelected = values.includes(OTHER_OPTION_ID);

  const otherValue = isMulti ? values : typeof answer?.value === "string" ? answer.value : OTHER_OPTION_ID;

  return (
    <div className="flex flex-col gap-2">
      {question.type === "yesno" ? (
        <div className="flex gap-2">
          {(options.length >= 2
            ? options.slice(0, 2).map((opt) => ({ id: opt.id, label: opt.label }))
            : [
                { id: "yes", label: t("session.yes") },
                { id: "no", label: t("session.no") },
              ]
          ).map((opt) => (
            <button
              key={opt.id}
              className={`flex-1 rounded-[var(--corner-radius-small)] border px-3 py-2 text-sm ${
                (opt.id === "yes" && answer?.value === true) ||
                (opt.id === "no" && answer?.value === false)
                  ? "border-[var(--app-claude-orange)] bg-[var(--app-tertiary-background)]"
                  : "border-[var(--app-border-color)]"
              }`}
              onClick={() => toggle(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        options.map((option) => (
          <label
            key={option.id}
            className="flex items-start gap-2 rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] bg-[var(--app-tertiary-background)] p-2 text-sm"
          >
            <input
              type={isMulti ? "checkbox" : "radio"}
              name={question.id}
              checked={values.includes(option.id)}
              onChange={() => toggle(option.id)}
              className="mt-1 h-4 w-4"
            />
            <span className="flex flex-col">
              <span className="font-semibold">{option.label}</span>
              {option.description ? (
                <span className="text-xs text-[var(--app-secondary-foreground)]">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))
      )}
      {question.allowOther && isOtherSelected ? (
        <OtherInput
          value={answer?.customText ?? ""}
          onChange={(value) =>
            onChange({ questionId: question.id, value: otherValue, customText: value })
          }
          placeholder={t("session.other_placeholder")}
        />
      ) : null}
    </div>
  );
}
