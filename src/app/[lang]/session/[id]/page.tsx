"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GuideText } from "@/components/guide/GuideText";
import { QuestionCard } from "@/components/question/QuestionCard";
import { ApiErrorModal } from "@/components/common/ApiErrorModal";
import { useI18n } from "@/hooks/useI18n";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSessionEngine } from "@/hooks/useSessionEngine";
import type { Session } from "@/types/session";
import { useHydrated } from "@/hooks/useHydrated";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, withLang } = useI18n();
  const { getSession, updateSession, ready } = useLocalStorage();
  const [isFinishing, setIsFinishing] = useState(false);
  const hydrated = useHydrated();

  const session = useMemo(() => {
    if (!ready) return undefined;
    return getSession(params.id);
  }, [getSession, params.id, ready]);

  const fallbackSession: Session = {
    id: params.id,
    title: "",
    initialInput: "",
    status: "active",
    language: "en",
    createdAt: "",
    updatedAt: "",
    questionGroups: [],
    answers: [],
  };

  const effectiveSession = session ?? fallbackSession;
  const handleSessionUpdate = (next: Session) => {
    if (!session) return;
    updateSession(next);
  };

  const {
    guideText,
    currentGroup,
    currentAnswers,
    updateAnswer,
    submitCurrent,
    goBack,
    isLoading,
    error,
    isComplete,
    showRetry,
    retry,
  } = useSessionEngine({ session: effectiveSession, onSessionUpdate: handleSessionUpdate, enabled: Boolean(session) });

  const [showApiErrorModal, setShowApiErrorModal] = useState(false);

  // Show API error modal when fetch fails or stream fails
  const isApiError = error === "errors.fetch_failed" || error === "errors.stream_failed";

  if (!hydrated) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("session.submit")}</p>
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

  const handleFinish = async () => {
    setIsFinishing(true);
    const response = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        language: session.language,
        history: session.questionGroups.flatMap((group) =>
          group.questions.map((question) => {
            const answer = session.answers.find((a) => a.questionId === question.id);
            const value = answer?.customText
              ? `${answer.value} (${answer.customText})`
              : answer?.value ?? "";
            return {
              question: question.question,
              answer: value,
            };
          }),
        ),
      }),
    });

    const data = await response.json();
    const nextSession: Session = {
      ...session,
      summary: data.summary,
      summaryEdited: data.markdown,
      status: "completed",
      updatedAt: new Date().toISOString(),
    };
    updateSession(nextSession);
    setIsFinishing(false);
    router.push(withLang(`/summary/${session.id}`));
  };

  const errorMessage = error?.startsWith("errors.") ? t(error) : error;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <GuideText text={guideText} isLoading={isLoading} />

      {error ? (
        <div className="rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-red-500/10 p-3 text-xs text-red-400">
          <div className="flex items-center justify-between">
            <span>{errorMessage}</span>
            <div className="flex gap-2">
              {isApiError ? (
                <button
                  onClick={() => setShowApiErrorModal(true)}
                  className="text-[var(--app-claude-orange)] hover:underline"
                >
                  {t("errors.api_limit_title")}
                </button>
              ) : null}
              {showRetry ? (
                <button
                  onClick={retry}
                  className="text-[var(--app-claude-orange)] hover:underline"
                >
                  {t("errors.retry")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <ApiErrorModal
        isOpen={showApiErrorModal}
        onClose={() => setShowApiErrorModal(false)}
        onRetry={showRetry ? retry : undefined}
      />

      {currentGroup ? (
        <QuestionCard
          key={`${currentGroup.id}-${currentGroup.createdAt}`}
          group={currentGroup}
          answers={currentAnswers}
          onAnswerChange={updateAnswer}
          onSubmit={submitCurrent}
          onBack={goBack}
          submitLabel={t("session.submit")}
          backLabel={t("session.back")}
          isLoading={isLoading}
        />
      ) : isLoading ? (
        <div className="flex w-full flex-col gap-4 rounded-[var(--corner-radius-large)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-6">
          <div className="flex gap-4 border-b border-[var(--app-border-color)] pb-4">
            <div className="h-4 w-24 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
            <div className="h-4 w-24 rounded bg-[var(--app-tertiary-background)] animate-pulse opacity-50" />
            <div className="h-4 w-24 rounded bg-[var(--app-tertiary-background)] animate-pulse opacity-50" />
          </div>
          <div className="space-y-4">
            <div className="h-5 w-3/4 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
            <div className="space-y-3">
              <div className="h-12 w-full rounded-lg bg-[var(--app-tertiary-background)] animate-pulse" />
              <div className="h-12 w-full rounded-lg bg-[var(--app-tertiary-background)] animate-pulse" />
              <div className="h-12 w-full rounded-lg bg-[var(--app-tertiary-background)] animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <div className="h-9 w-16 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
            <div className="h-9 w-24 rounded bg-[var(--app-tertiary-background)] animate-pulse" />
          </div>
        </div>
      ) : null}

      {isComplete && !currentGroup ? (
        <button
          className="self-end rounded-[var(--corner-radius-small)] bg-[var(--app-claude-orange)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleFinish}
          disabled={isFinishing}
        >
          {t("session.finish")}
        </button>
      ) : null}
    </main>
  );
}
