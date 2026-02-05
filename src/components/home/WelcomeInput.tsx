"use client";

import { ChangeEvent, useState, useCallback } from "react";
import { Turnstile } from "@/components/common/Turnstile";

const isTurnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE !== "false";

interface WelcomeInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onStart: (turnstileToken: string) => void;
  startLabel: string;
}

export function WelcomeInput({ value, placeholder, onChange, onStart, startLabel }: WelcomeInputProps) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleStart = () => {
    if (isTurnstileEnabled && turnstileToken) {
      onStart(turnstileToken);
    } else if (!isTurnstileEnabled) {
      onStart("");
    }
  };

  const isDisabled = !value.trim() || (isTurnstileEnabled && !turnstileToken);

  return (
    <div className="flex w-full flex-col gap-3">
      <textarea
        className="min-h-[120px] w-full resize-none rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-3 text-sm text-[var(--app-primary-foreground)] outline-none focus:border-[var(--app-claude-orange)]"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        maxLength={2000}
      />
      {isTurnstileEnabled && (
        <Turnstile onVerify={handleVerify} onExpire={handleExpire} />
      )}
      <button
        className="inline-flex items-center justify-center rounded-[var(--corner-radius-medium)] bg-[var(--app-claude-orange)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleStart}
        disabled={isDisabled}
      >
        {startLabel}
      </button>
    </div>
  );
}
