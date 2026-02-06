import { z } from "zod";
import { HistoryItemSchema, LanguageSchema, MAX_HISTORY_ITEMS } from "@/lib/apiSchemas";

export const SummaryRequestSchema = z.object({
  sessionId: z.string().min(1),
  language: LanguageSchema,
  history: z.array(HistoryItemSchema).max(MAX_HISTORY_ITEMS),
});

export type SummaryRequest = z.infer<typeof SummaryRequestSchema>;

