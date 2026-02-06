import { z } from "zod";

import {
  MAX_ANSWER_LENGTH,
  MAX_QUESTION_LENGTH,
} from "@/lib/apiLimits";

export { MAX_ANSWER_LENGTH, MAX_HISTORY_ITEMS, MAX_INPUT_LENGTH, MAX_QUESTION_LENGTH } from "@/lib/apiLimits";

export const TemplateTypeSchema = z.enum(["technical", "feature", "bugfix", "refactor", "custom"]);
export const LanguageSchema = z.enum(["en", "zh"]);

export const HistoryItemSchema = z.object({
  question: z.string().min(1).max(MAX_QUESTION_LENGTH),
  answer: z.union([
    z.string().max(MAX_ANSWER_LENGTH),
    z.array(z.string().max(MAX_ANSWER_LENGTH)),
    z.number(),
    z.boolean(),
  ]),
});

export type HistoryItem = z.infer<typeof HistoryItemSchema>;
