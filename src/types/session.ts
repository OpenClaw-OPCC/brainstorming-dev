import type { Answer, QuestionGroup } from "./question";
import type { Summary } from "./summary";

export type TemplateType = "technical" | "feature" | "bugfix" | "refactor" | "custom";

export interface Session {
  id: string;
  title: string;
  initialInput: string;
  status: "active" | "completed";
  language: "en" | "zh";
  template?: TemplateType;
  createdAt: string;
  updatedAt: string;
  questionGroups: QuestionGroup[];
  answers: Answer[];
  summary?: Summary;
  summaryEdited?: string;
  turnstileToken?: string;
}
