"use client";

interface SubmitBarProps {
  onSubmit: () => void;
  onBack: () => void;
  canSubmit: boolean;
  submitLabel: string;
  backLabel: string;
  isLoading?: boolean;
}

export function SubmitBar({ onSubmit, onBack, canSubmit, submitLabel, backLabel, isLoading = false }: SubmitBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--app-border-color)] pt-3">
      <button
        className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onBack}
        disabled={isLoading}
      >
        {backLabel}
      </button>
      <button
        className="rounded-[var(--corner-radius-small)] bg-[var(--app-claude-orange)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onSubmit}
        disabled={!canSubmit || isLoading}
      >
        {submitLabel}
      </button>
    </div>
  );
}
