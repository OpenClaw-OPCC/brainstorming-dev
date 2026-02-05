import type { TemplateType } from "@/types/session";

export interface TemplateDefinition {
  id: TemplateType;
  titleKey: string;
  descriptionKey: string;
  promptKey: string;
}

export const templates: TemplateDefinition[] = [
  {
    id: "technical",
    titleKey: "templates.technical.title",
    descriptionKey: "templates.technical.description",
    promptKey: "templates.technical.prompt",
  },
  {
    id: "feature",
    titleKey: "templates.feature.title",
    descriptionKey: "templates.feature.description",
    promptKey: "templates.feature.prompt",
  },
  {
    id: "bugfix",
    titleKey: "templates.bugfix.title",
    descriptionKey: "templates.bugfix.description",
    promptKey: "templates.bugfix.prompt",
  },
  {
    id: "refactor",
    titleKey: "templates.refactor.title",
    descriptionKey: "templates.refactor.description",
    promptKey: "templates.refactor.prompt",
  },
];
