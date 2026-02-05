export type QuestionType = "single" | "multi" | "text" | "slider" | "yesno";

export interface Option {
  id: string;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  question: string;
  options?: Option[];
  min?: number;
  max?: number;
  step?: number;
  allowOther?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

export interface QuestionGroup {
  id: string;
  createdAt: string;
  questions: Question[];
  guideText?: string;
}

export type AnswerValue = string | string[] | number | boolean;

export interface Answer {
  questionId: string;
  value: AnswerValue;
  customText?: string;
}
