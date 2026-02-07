"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Turnstile } from "@/components/common/Turnstile";

const buildTimeTurnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE !== "false";
const buildTimeTurnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (token: string) => Promise<void> | void;
}

export function VerificationModal({ isOpen, onClose, onVerified }: VerificationModalProps) {
  const { t } = useI18n();
  const [turnstileEnabled, setTurnstileEnabled] = useState(buildTimeTurnstileEnabled);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(buildTimeTurnstileSiteKey);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTurnstileToken(null);
    setTurnstileError(null);
    setIsSubmitting(false);

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
  }, [isOpen]);

  const handleVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  }, []);

  const handleExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileError(t("errors.turnstile_failed"));
  }, [t]);

  const handleContinue = async () => {
    if (!turnstileToken) return;
    setIsSubmitting(true);
    try {
      await onVerified(turnstileToken);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isTurnstileMisconfigured = turnstileEnabled && !turnstileSiteKey;
  const isDisabled =
    isSubmitting ||
    (turnstileEnabled && (!turnstileToken || isTurnstileMisconfigured || Boolean(turnstileError)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-[var(--corner-radius-large)] border border-[var(--app-border-color)] bg-[var(--app-primary-background)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--app-primary-foreground)]">
          {t("errors.verify_title")}
        </h2>
        <p className="mt-3 text-sm text-[var(--app-secondary-foreground)]">
          {t("errors.verify_description")}
        </p>

        {turnstileEnabled ? (
          <div className="mt-4 rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-4">
            {turnstileSiteKey ? (
              <Turnstile
                siteKey={turnstileSiteKey}
                onVerify={handleVerify}
                onExpire={handleExpire}
                onError={handleTurnstileError}
              />
            ) : (
              <div className="text-xs text-[var(--app-secondary-foreground)]">
                Turnstile is enabled but the site key is missing. Set{" "}
                <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code>.
              </div>
            )}
          </div>
        ) : null}

        {turnstileError ? (
          <div className="mt-3 rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-tertiary-background)] px-3 py-2 text-xs text-[var(--app-secondary-foreground)]">
            {turnstileError}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-4 py-2 text-sm text-[var(--app-primary-foreground)] hover:bg-[var(--app-secondary-background)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {t("errors.close")}
          </button>
          <button
            onClick={handleContinue}
            className="rounded-[var(--corner-radius-small)] bg-[var(--app-claude-orange)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
          >
            {t("errors.verify_continue")}
          </button>
        </div>
      </div>
    </div>
  );
}

