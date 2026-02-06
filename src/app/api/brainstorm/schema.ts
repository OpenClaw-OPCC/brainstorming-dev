import { z } from "zod";
import {
  HistoryItemSchema,
  LanguageSchema,
  MAX_HISTORY_ITEMS,
  MAX_INPUT_LENGTH,
  TemplateTypeSchema,
} from "@/lib/apiSchemas";

export { MAX_INPUT_LENGTH, MAX_ANSWER_LENGTH } from "@/lib/apiSchemas";

const ActionSchema = z.enum(["start", "answer", "retry"]);

export const BrainstormRequestSchema = z
  .object({
    sessionId: z.string().min(1),
    input: z.string().trim().min(1).max(MAX_INPUT_LENGTH).optional(),
    template: TemplateTypeSchema.optional(),
    language: LanguageSchema,
    history: z.array(HistoryItemSchema).max(MAX_HISTORY_ITEMS),
    action: ActionSchema,
    turnstileToken: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "start" && !value.input) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["input"],
        message: "input is required when action is start",
      });
    }
  });

export type BrainstormRequest = z.infer<typeof BrainstormRequestSchema>;
