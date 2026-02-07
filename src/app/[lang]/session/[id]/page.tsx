"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GuideText } from "@/components/guide/GuideText";
import { QuestionCard } from "@/components/question/QuestionCard";
import { ApiErrorModal } from "@/components/common/ApiErrorModal";
import { VerificationModal } from "@/components/common/VerificationModal";
import { useI18n } from "@/hooks/useI18n";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLeaveConfirmation } from "@/hooks/useLeaveConfirmation";
import { useSessionEngine } from "@/hooks/useSessionEngine";
import type { Session } from "@/types/session";
import { useHydrated } from "@/hooks/useHydrated";
// Summary generation now happens on the summary page.

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

  useLeaveConfirmation({ enabled: session?.status === "active", message: t("leave.confirm") });

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
    resumeAfterVerification,
  } = useSessionEngine({ session: effectiveSession, onSessionUpdate: handleSessionUpdate, enabled: Boolean(session) });

  const [showApiErrorModal, setShowApiErrorModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const combinedError = error;

  // Show API error modal when fetch fails or stream fails
  const isApiError = combinedError === "errors.fetch_failed" || combinedError === "errors.stream_failed";
  const isVerificationExpired = combinedError === "errors.verification_expired";

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

  const handleFinish = () => {
    // Navigate immediately and generate the report on the summary page.
    // This avoids the "disabled button with no feedback" experience.
    setIsFinishing(true);

    // Mark the session as completed (Q&A finished). The summary page will only generate
    // when the session is completed, which prevents accidental summary generation when
    // someone opens /summary/:id too early.
    updateSession({
      ...session,
      status: "completed",
      updatedAt: new Date().toISOString(),
    });

    // Safety fallback: if navigation fails for any reason, re-enable the button.
    setTimeout(() => setIsFinishing(false), 5000);

    router.push(withLang(`/summary/${session.id}`));
  };

  const handleVerified = async (token: string) => {
    setShowVerificationModal(false);
    await resumeAfterVerification(token);
  };

  const errorMessage = combinedError?.startsWith("errors.") ? t(combinedError) : combinedError;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <GuideText text={guideText} isLoading={isLoading} />

      {combinedError ? (
        <div className="rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-red-500/10 p-3 text-xs text-red-400">
          <div className="flex items-center justify-between">
            <span>{errorMessage}</span>
            <div className="flex gap-2">
              {isVerificationExpired ? (
                <>
                  <button
                    onClick={() => setShowVerificationModal(true)}
                    className="text-[var(--app-claude-orange)] hover:underline"
                  >
                    {t("errors.verify_again")}
                  </button>
                  <button
                    onClick={() => router.push(withLang("/"))}
                    className="text-[var(--app-claude-orange)] hover:underline"
                  >
                    {t("common.go_home")}
                  </button>
                </>
              ) : null}
              {isApiError ? (
                <button
                  onClick={() => setShowApiErrorModal(true)}
                  className="text-[var(--app-claude-orange)] hover:underline"
                >
                  {t("errors.api_limit_title")}
                </button>
              ) : null}
              {showRetry && !isVerificationExpired ? (
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
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerified={handleVerified}
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
          nextLabel={t("session.next")}
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
