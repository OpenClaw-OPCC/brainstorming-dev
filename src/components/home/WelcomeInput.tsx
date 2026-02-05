"use client";

import { ChangeEvent } from "react";

interface WelcomeInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onStart: () => void;
  startLabel: string;
}

export function WelcomeInput({ value, placeholder, onChange, onStart, startLabel }: WelcomeInputProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <textarea
        className="min-h-[120px] w-full resize-none rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-3 text-sm text-[var(--app-primary-foreground)] outline-none focus:border-[var(--app-claude-orange)]"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
      <button
        className="inline-flex items-center justify-center rounded-[var(--corner-radius-medium)] bg-[var(--app-claude-orange)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onStart}
        disabled={!value.trim()}
      >
        {startLabel}
      </button>
    </div>
  );
}
