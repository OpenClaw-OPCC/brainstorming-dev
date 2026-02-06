"use client";

import { ChangeEvent, useEffect, useState, useCallback } from "react";
import { Turnstile } from "@/components/common/Turnstile";
import { MAX_INPUT_LENGTH } from "@/lib/apiLimits";

const buildTimeTurnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE !== "false";
const buildTimeTurnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

interface WelcomeInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onStart: (turnstileToken: string) => void;
  startLabel: string;
}

export function WelcomeInput({ value, placeholder, onChange, onStart, startLabel }: WelcomeInputProps) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileEnabled, setTurnstileEnabled] = useState(buildTimeTurnstileEnabled);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(buildTimeTurnstileSiteKey);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as unknown;
        if (!data || typeof data !== "object") return;
        const turnstile = (data as { turnstile?: unknown }).turnstile;
        if (!turnstile || typeof turnstile !== "object") return;

        const enabled = (turnstile as { enabled?: unknown }).enabled;
        const siteKey = (turnstile as { siteKey?: unknown }).siteKey;

        if (cancelled) return;
        if (typeof enabled === "boolean") setTurnstileEnabled(enabled);
        if (typeof siteKey === "string" || siteKey === null) setTurnstileSiteKey(siteKey);
      } catch {
        // Ignore config fetch errors; fallback to build-time env.
      }
    };

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  }, []);

  const handleExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileError("Turnstile failed to load. Please disable content blockers and refresh.");
  }, []);

  const handleStart = () => {
    if (turnstileEnabled && turnstileToken) {
      onStart(turnstileToken);
    } else if (!turnstileEnabled) {
      onStart("");
    }
  };

  const shouldShowTurnstile = turnstileEnabled;
  const isTurnstileMisconfigured = turnstileEnabled && !turnstileSiteKey;
  const isDisabled =
    !value.trim() ||
    (turnstileEnabled && (!turnstileToken || isTurnstileMisconfigured || Boolean(turnstileError)));

  return (
    <div className="flex w-full flex-col gap-3">
      <textarea
        className="min-h-[120px] w-full resize-none rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-3 text-sm text-[var(--app-primary-foreground)] outline-none focus:border-[var(--app-claude-orange)]"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        maxLength={MAX_INPUT_LENGTH}
      />
      {shouldShowTurnstile ? (
        turnstileSiteKey ? (
          <Turnstile
            siteKey={turnstileSiteKey}
            onVerify={handleVerify}
            onExpire={handleExpire}
            onError={handleTurnstileError}
          />
        ) : (
          <div className="rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-tertiary-background)] px-3 py-2 text-xs text-[var(--app-secondary-foreground)]">
            Turnstile is enabled but the site key is missing. Set <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code>.
          </div>
        )
      ) : null}
      {turnstileError ? (
        <div className="rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-tertiary-background)] px-3 py-2 text-xs text-[var(--app-secondary-foreground)]">
          {turnstileError}
        </div>
      ) : null}
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
