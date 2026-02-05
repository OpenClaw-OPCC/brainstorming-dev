"use client";

import { useI18n } from "@/hooks/useI18n";

interface ApiErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export function ApiErrorModal({ isOpen, onClose, onRetry }: ApiErrorModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-[var(--corner-radius-large)] border border-[var(--app-border-color)] bg-[var(--app-primary-background)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--app-primary-foreground)]">
          {t("errors.api_limit_title")}
        </h2>
        <p className="mt-3 text-sm text-[var(--app-secondary-foreground)]">
          {t("errors.api_limit_description")}
        </p>
        <div className="mt-4 rounded-[var(--corner-radius-medium)] bg-[var(--app-secondary-background)] p-4">
          <p className="text-xs text-[var(--app-secondary-foreground)]">
            {t("errors.api_limit_steps")}
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[var(--app-primary-foreground)]">
            <li>
              <a
                href="https://github.com/OpenClaw-OPCC/brainstorming-dev"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--app-claude-orange)] hover:underline"
              >
                {t("errors.api_limit_clone")}
              </a>
            </li>
            <li>{t("errors.api_limit_env")}</li>
            <li>{t("errors.api_limit_run")}</li>
          </ol>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {onRetry ? (
            <button
              onClick={onRetry}
              className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-4 py-2 text-sm text-[var(--app-primary-foreground)] hover:bg-[var(--app-secondary-background)]"
            >
              {t("errors.retry")}
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="rounded-[var(--corner-radius-small)] bg-[var(--app-claude-orange)] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("errors.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
