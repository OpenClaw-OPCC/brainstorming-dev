"use client";

import { useI18n } from "@/hooks/useI18n";

interface GuideTextProps {
  text: string;
  isLoading: boolean;
}

export function GuideText({ text, isLoading }: GuideTextProps) {
  const { t } = useI18n();

  // Hide completely when no text and not loading
  if (!text && !isLoading) {
    return null;
  }

  const showSkeleton = isLoading && !text;

  return (
    <div className="rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--app-secondary-foreground)]">
        {t("session.guide")}
      </div>
      {showSkeleton ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--app-secondary-foreground)]">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--app-claude-orange)] animate-pulse" />
            <span>{t("session.loading")}</span>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded-full bg-[var(--app-tertiary-background)] animate-pulse" />
            <div className="h-3 w-2/3 rounded-full bg-[var(--app-tertiary-background)] animate-pulse" />
            <div className="h-3 w-1/2 rounded-full bg-[var(--app-tertiary-background)] animate-pulse" />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--app-primary-foreground)]">
          {text}
          {isLoading && text ? <span className="opacity-60"> ▍</span> : null}
        </p>
      )}
    </div>
  );
}
