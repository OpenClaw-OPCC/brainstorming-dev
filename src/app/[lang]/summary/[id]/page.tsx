"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/summary/MarkdownEditor";
import { MarkdownPreview } from "@/components/summary/MarkdownPreview";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/hooks/useI18n";
import { summaryToMarkdown } from "@/lib/markdown";
import { useHydrated } from "@/hooks/useHydrated";
import { buildSessionHistory } from "@/lib/sessionHistory";
import type { Summary } from "@/types/summary";

export default function SummaryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, withLang } = useI18n();
  const { getSession, updateSession, ready } = useLocalStorage();
  const hydrated = useHydrated();
  const session = useMemo(() => {
    if (!ready) return undefined;
    return getSession(params.id);
  }, [getSession, params.id, ready]);

  const baseMarkdown = useMemo(() => {
    if (!session) return "";
    return session.summaryEdited ?? (session.summary ? summaryToMarkdown(session.summary) : "");
  }, [session]);

  const [markdown, setMarkdown] = useState(baseMarkdown);
  const [isGenerating, setIsGenerating] = useState(() => baseMarkdown.trim().length === 0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!session) return;
    if (markdown === baseMarkdown) return;
    updateSession({ ...session, summaryEdited: markdown });
  }, [baseMarkdown, markdown, session, updateSession]);

  useEffect(() => {
    // If content appears (e.g., restored from storage), hide the generating UI.
    if (baseMarkdown.trim().length > 0) {
      setIsGenerating(false);
    }
  }, [baseMarkdown]);

  const canGenerate = session?.status === "completed";

  useEffect(() => {
    if (!session) return;

    // Only generate when the user has explicitly finished the Q&A.
    if (!canGenerate) return;

    // If we already have content, don't generate.
    const alreadyHasContent = Boolean(baseMarkdown && baseMarkdown.trim().length > 0);
    if (alreadyHasContent) return;

    // Avoid double-triggering in React strict mode / rerenders.
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setIsGenerating(true);
      setGenerateError(null);

      try {
        const history = buildSessionHistory(session);
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            language: session.language,
            history,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 403) {
            try {
              const data = (await response.json()) as unknown;
              const code = data && typeof data === "object" ? (data as { code?: unknown }).code : null;
              if (code === "TURNSTILE_EXPIRED") {
                setGenerateError("errors.verification_expired");
                return;
              }
            } catch {
              // ignore
            }
          }

          setGenerateError("errors.summary_failed");
          return;
        }

        const data = (await response.json()) as { summary: Summary | null; markdown: string };
        const nextMarkdown = data.markdown ?? "";

        if (cancelled) return;

        updateSession({
          ...session,
          summary: data.summary ?? undefined,
          summaryEdited: nextMarkdown,
          status: "completed",
          updatedAt: new Date().toISOString(),
        });
        setMarkdown(nextMarkdown);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setGenerateError("errors.summary_failed");
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [baseMarkdown, canGenerate, retryKey, session, updateSession]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("summary.title")}</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("common.not_found")}</p>
        <button
          className="text-sm text-[var(--app-claude-orange)]"
          onClick={() => router.push(withLang("/"))}
        >
          {t("common.go_home")}
        </button>
      </main>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title || "summary"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackToQuestions = () => {
    router.push(withLang(`/session/${session.id}`));
  };

  const handleGoHome = () => {
    router.push(withLang("/"));
  };

  const handleRetry = () => {
    // Manual retry: re-run generation even if the previous attempt errored.
    hasTriggeredRef.current = false;
    setGenerateError(null);
    setIsGenerating(true);
    setRetryKey((k) => k + 1);
  };

  const errorMessage = generateError?.startsWith("errors.") ? t(generateError) : generateError;
  const isVerificationExpired = generateError === "errors.verification_expired";
  const title = generateError
    ? isVerificationExpired
      ? t("errors.verification_expired")
      : t("errors.summary_failed")
    : t("summary.generating_title");

  if (!canGenerate && baseMarkdown.trim().length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">{t("summary.not_ready_title")}</h1>
          <p className="text-sm text-[var(--app-secondary-foreground)]">{t("summary.not_ready_hint")}</p>
          <div className="mt-2 flex gap-2">
            <button
              className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-3 py-1 text-xs"
              onClick={handleBackToQuestions}
            >
              {t("summary.back_to_questions")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (isGenerating || generateError) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {isGenerating && !generateError ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--app-border-color)] border-t-[var(--app-claude-orange)]" />
              ) : null}
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            {!generateError ? (
              <p className="text-sm text-[var(--app-secondary-foreground)]">{t("summary.generating_hint")}</p>
            ) : null}
            {generateError ? (
              <div className="mt-2 rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-red-500/10 p-3 text-xs text-red-400">
                {errorMessage}
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-3 py-1 text-xs"
              onClick={handleBackToQuestions}
            >
              {t("summary.back_to_questions")}
            </button>
            {generateError ? (
              isVerificationExpired ? (
                <button
                  className="rounded-[var(--corner-radius-small)] bg-[var(--app-claude-orange)] px-3 py-1 text-xs font-semibold text-white"
                  onClick={handleGoHome}
                >
                  {t("common.go_home")}
                </button>
              ) : (
                <button
                  className="rounded-[var(--corner-radius-small)] bg-[var(--app-claude-orange)] px-3 py-1 text-xs font-semibold text-white"
                  onClick={handleRetry}
                >
                  {t("summary.retry")}
                </button>
              )
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-[var(--app-secondary-foreground)]">{t("summary.editor")}</span>
            <div className="h-[520px] rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-4">
              <div className="h-4 w-2/3 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
              <div className="mt-4 space-y-3">
                <div className="h-3 w-full rounded bg-[var(--app-tertiary-background)] animate-pulse" />
                <div className="h-3 w-11/12 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
                <div className="h-3 w-10/12 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
                <div className="h-3 w-9/12 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
                <div className="h-3 w-11/12 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-[var(--app-secondary-foreground)]">{t("summary.preview")}</span>
            <div className="h-[520px] rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-4">
              <div className="h-4 w-1/2 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
              <div className="mt-4 space-y-3">
                <div className="h-3 w-full rounded bg-[var(--app-tertiary-background)] animate-pulse" />
                <div className="h-3 w-10/12 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
                <div className="h-3 w-11/12 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
                <div className="h-3 w-9/12 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("summary.title")}</h1>
        <div className="flex gap-2">
          <button
            className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-3 py-1 text-xs"
            onClick={handleCopy}
          >
            {t("summary.copy")}
          </button>
          <button
            className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-3 py-1 text-xs"
            onClick={handleDownload}
          >
            {t("summary.download")}
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-[var(--app-secondary-foreground)]">{t("summary.editor")}</span>
          <MarkdownEditor value={markdown} onChange={setMarkdown} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-[var(--app-secondary-foreground)]">{t("summary.preview")}</span>
          <MarkdownPreview value={markdown} />
        </div>
      </div>
    </main>
  );
}

