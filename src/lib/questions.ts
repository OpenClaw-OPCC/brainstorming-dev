import type { Answer, Question, QuestionGroup } from "@/types/question";
import type { Session } from "@/types/session";
import { OTHER_OPTION_ID } from "@/lib/validation";

const OTHER_LABELS = new Set(["other", "其他", "其它"]);

function isOtherOption(option: { id?: string; label?: string } | undefined) {
  if (!option) return false;
  const id = typeof option.id === "string" ? option.id.toLowerCase() : "";
  const label = typeof option.label === "string" ? option.label.toLowerCase() : "";
  const labelIsOther =
    label === "other" ||
    label.startsWith("other") ||
    label.includes(" other") ||
    label.includes("其他") ||
    label.includes("其它");
  return id === "other" || id === OTHER_OPTION_ID || OTHER_LABELS.has(label) || labelIsOther;
}

export function normalizeQuestionType(rawType: unknown, question?: Partial<Question>) {
  const type = typeof rawType === "string" ? rawType.toLowerCase() : "";
  let normalized: Question["type"] | undefined;
  if (type === "single" || type === "radio" || type === "single_choice") normalized = "single";
  if (
    type === "multi" ||
    type === "checkbox" ||
    type === "multi_select" ||
    type === "multi-choice" ||
    type === "multi choice" ||
    type === "multichoice"
  )
    normalized = "multi";
  if (type === "multiple_choice") {
    if (typeof question?.maxSelections === "number" && question.maxSelections === 1) normalized = "single";
    if (typeof question?.minSelections === "number" && question.minSelections > 1) normalized = "multi";
    if (!normalized) normalized = "multi";
  }
  if (type === "text" || type === "free_text" || type === "textarea") normalized = "text";
  if (type === "slider" || type === "rating" || type === "number") normalized = "single";
  if (type === "yesno" || type === "yes_no" || type === "boolean") normalized = "yesno";

  const questionText = `${question?.question ?? ""} ${question?.title ?? ""}`.toLowerCase();
  if (
    questionText.includes("多选") ||
    questionText.includes("可多选") ||
    questionText.includes("multi-select") ||
    questionText.includes("multi select")
  ) {
    return "multi";
  }
  if (questionText.includes("单选") || questionText.includes("single-select") || questionText.includes("single select")) {
    return normalized ?? "single";
  }

  if (normalized) return normalized;

  if (Array.isArray(question?.options)) {
    if (typeof question?.maxSelections === "number" && question.maxSelections > 1) return "multi";
    if (typeof question?.minSelections === "number" && question.minSelections > 1) return "multi";
    return "single";
  }

  if (typeof question?.min === "number" || typeof question?.max === "number") return "single";
  return "text";
}

export function normalizeQuestion(
  raw: Question,
  fallback?: { id?: string; title?: string; question?: string },
): Question {
  const rawAny = raw as Question & {
    allow_other?: boolean;
    min_selections?: number;
    max_selections?: number;
    options?: Array<Record<string, unknown>>;
    title?: string;
    question?: string;
    id?: string;
  };
  const type = normalizeQuestionType(rawAny.type, rawAny);
  const isSliderLike =
    ["slider", "rating", "number"].includes(typeof rawAny.type === "string" ? rawAny.type.toLowerCase() : "") ||
    typeof rawAny.min === "number" ||
    typeof rawAny.max === "number";
  let options = Array.isArray(rawAny.options) ? rawAny.options : undefined;
  let allowOther = Boolean(
    typeof rawAny.allowOther === "boolean"
      ? rawAny.allowOther
      : typeof rawAny.allow_other === "boolean"
        ? rawAny.allow_other
        : false,
  );
  const minSelections =
    typeof rawAny.minSelections === "number"
      ? rawAny.minSelections
      : typeof rawAny.min_selections === "number"
        ? rawAny.min_selections
        : undefined;
  const maxSelections =
    typeof rawAny.maxSelections === "number"
      ? rawAny.maxSelections
      : typeof rawAny.max_selections === "number"
        ? rawAny.max_selections
        : undefined;
  const baseQuestion =
    typeof rawAny.question === "string" && rawAny.question.trim().length > 0
      ? rawAny.question
      : fallback?.question ?? "";
  const baseTitle =
    typeof rawAny.title === "string" && rawAny.title.trim().length > 0
      ? rawAny.title
      : fallback?.title ?? baseQuestion ?? "";
  const baseId =
    typeof rawAny.id === "string" && rawAny.id.trim().length > 0 ? rawAny.id : fallback?.id ?? "";
  const safeId = baseId || `q_${Date.now()}`;

  if (options) {
    let foundOther = false;
    const normalizedOptions = options
      .map((option, index) => {
        const optionAny = option as Record<string, unknown>;
        const idRaw =
          typeof optionAny.id === "string"
            ? optionAny.id
            : typeof optionAny.value === "string"
              ? optionAny.value
              : `option_${index + 1}`;
        const labelRaw =
          typeof optionAny.label === "string"
            ? optionAny.label
            : typeof optionAny.text === "string"
              ? optionAny.text
              : typeof optionAny.value === "string"
                ? optionAny.value
                : `Option ${index + 1}`;
        const descriptionRaw =
          typeof optionAny.description === "string"
            ? optionAny.description
            : typeof optionAny.desc === "string"
              ? optionAny.desc
              : undefined;
        return {
          id: idRaw,
          label: labelRaw,
          description: descriptionRaw,
        };
      })
      .filter((option) => {
        if (isOtherOption(option)) {
          foundOther = true;
          return false;
        }
        return true;
      });
    if (foundOther) allowOther = true;
    options = normalizedOptions;
  }

  if (isSliderLike && (!options || options.length === 0)) {
    const min = typeof rawAny.min === "number" ? rawAny.min : 1;
    const max = typeof rawAny.max === "number" ? rawAny.max : 10;
    const step = typeof rawAny.step === "number" && rawAny.step > 0 ? rawAny.step : 1;
    const steps = Math.floor((max - min) / step);
    let values: number[] = [];
    if (steps <= 6) {
      for (let value = min; value <= max; value += step) {
        values.push(value);
      }
    } else {
      const midRaw = Math.round((min + max) / 2);
      const mid = Math.min(max, Math.max(min, midRaw));
      values = [min, mid, max];
    }
    const unique = Array.from(new Set(values));
    options = unique.map((value) => ({ id: String(value), label: String(value) }));
  }

  return {
    ...rawAny,
    id: safeId,
    title: baseTitle || baseQuestion || "Question",
    question: baseQuestion || baseTitle || "Question",
    type,
    options,
    allowOther,
    minSelections,
    maxSelections,
  };
}

export function normalizeQuestionGroup(group: QuestionGroup): QuestionGroup {
  const seen = new Set<string>();
  const prefix = group.id || "group";
  return {
    ...group,
    questions: group.questions.map((question, index) => {
      const baseId = question.id || `${prefix}_q_${index + 1}`;
      let id = baseId;
      let counter = 1;
      while (seen.has(id)) {
        id = `${baseId}_${counter}`;
        counter += 1;
      }
      seen.add(id);
      return normalizeQuestion(question, {
        id,
        title: question.title || `Question ${index + 1}`,
        question: question.question || question.title || `Question ${index + 1}`,
      });
    }),
  };
}

function normalizeAnswer(answer: Answer, question?: Question): Answer {
  if (!question) return answer;

  if (question.type === "yesno") {
    if (answer.value === "yes") return { ...answer, value: true };
    if (answer.value === "no") return { ...answer, value: false };
  }

  if (question.type === "slider" && typeof answer.value === "string") {
    const parsed = Number(answer.value);
    return Number.isNaN(parsed) ? answer : { ...answer, value: parsed };
  }

  if (question.type === "multi") {
    const values = Array.isArray(answer.value) ? answer.value : [answer.value as string];
    const normalizedValues = values.map((value) =>
      typeof value === "string" && value.toLowerCase() === "other" ? OTHER_OPTION_ID : value,
    );
    return { ...answer, value: normalizedValues };
  }

  if (question.type === "single") {
    if (Array.isArray(answer.value)) {
      return { ...answer, value: answer.value[0] ?? "" };
    }
    if (typeof answer.value === "string" && answer.value.toLowerCase() === "other") {
      return { ...answer, value: OTHER_OPTION_ID };
    }
  }

  return answer;
}

export function normalizeSession(session: Session): Session {
  const normalizedGroups = session.questionGroups.map((group) => normalizeQuestionGroup(group));
  const questionMap = new Map<string, Question>();
  normalizedGroups.forEach((group) => {
    group.questions.forEach((question) => {
      questionMap.set(question.id, question);
    });
  });
  const normalizedAnswers = session.answers.map((answer) =>
    normalizeAnswer(answer, questionMap.get(answer.questionId)),
  );

  return {
    ...session,
    questionGroups: normalizedGroups,
    answers: normalizedAnswers,
  };
}

export function normalizeQuestionsPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;
  const data = payload as { questions?: Question[]; groupId?: string };
  if (!Array.isArray(data.questions)) return payload;
  const groupId = typeof data.groupId === "string" && data.groupId.length > 0 ? data.groupId : "group";
  const normalizedGroup = normalizeQuestionGroup({
    id: groupId,
    createdAt: new Date().toISOString(),
    questions: data.questions,
  });
  return {
    ...(payload as Record<string, unknown>),
    questions: normalizedGroup.questions,
  };
}
