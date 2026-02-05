"use client";

import type { TemplateDefinition } from "@/lib/templates";

interface TemplateCardsProps {
  templates: TemplateDefinition[];
  title: string;
  getTitle: (key: string) => string;
  getDescription: (key: string) => string;
  getPrompt: (key: string) => string;
  onSelect: (templateId: string, prompt: string) => void;
}

export function TemplateCards({
  templates,
  title,
  getTitle,
  getDescription,
  getPrompt,
  onSelect,
}: TemplateCardsProps) {
  return (
    <div id="templates" className="flex w-full flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--app-primary-foreground)]">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <button
            key={template.id}
            className="flex flex-col gap-2 rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-3 text-left hover:border-[var(--app-claude-orange)]"
            onClick={() => onSelect(template.id, getPrompt(template.promptKey))}
          >
            <span className="text-sm font-semibold">{getTitle(template.titleKey)}</span>
            <span className="text-xs text-[var(--app-secondary-foreground)]">
              {getDescription(template.descriptionKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
