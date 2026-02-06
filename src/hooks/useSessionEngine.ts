"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Answer, Question, QuestionGroup } from "@/types/question";
import type { Session } from "@/types/session";
import { readSse, SsePayload } from "@/lib/sse";
import { validateGroup } from "@/lib/validation";
import { normalizeQuestionsPayload, normalizeQuestionGroup } from "@/lib/questions";
import { clampHistoryAnswer, clampHistoryQuestion } from "@/lib/apiClamp";
import { MAX_HISTORY_ITEMS } from "@/lib/apiLimits";
import {
  COMPLETION_PHRASES,
  HARD_GROUP_LIMIT,
  SOFT_GROUP_LIMIT,
  buildGroupSignature,
  findFirstIncompleteGroup,
  getAnswersForGroup,
  isConfirmationGroup,
  sanitizeGuideText,
  serializeAnswer,
} from "@/lib/session-engine";

interface UseSessionEngineOptions {
  session: Session;
  onSessionUpdate: (session: Session) => void;
  enabled?: boolean;
}

interface QuestionsPayload {
  groupId: string;
  questions: Question[];
}

export function useSessionEngine({ session, onSessionUpdate, enabled = true }: UseSessionEngineOptions) {
  const [guideText, setGuideText] = useState("");
  const guideTextRef = useRef("");
  const inFlightRef = useRef(false);
  const retryCountRef = useRef(0);
  const [pendingRetry, setPendingRetry] = useState(false);
  const repeatGuardRef = useRef<{ signature: string; count: number } | null>(null);
  const sessionRef = useRef(session);
  const questionGroupsRef = useRef(session.questionGroups);

  useEffect(() => {
    sessionRef.current = session;
    questionGroupsRef.current = session.questionGroups;
  }, [session]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState<number>(-1);
  const [currentGroup, setCurrentGroup] = useState<QuestionGroup | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  const buildHistoryPayload = useCallback(
    (sessionLike: Session, answersOverride?: Answer[]) => {
      const answers = answersOverride ?? sessionLike.answers;
      const items = sessionLike.questionGroups
        .flatMap((group) =>
          group.questions.map((question) => {
            const answer = answers.find((a) => a.questionId === question.id);
            if (!answer) return null;
            return {
              question: clampHistoryQuestion(question.question),
              answer: clampHistoryAnswer(serializeAnswer(question, answer)),
            };
          }),
        )
        .filter(Boolean) as Array<{ question: string; answer: string | string[] | number | boolean }>;

      if (items.length <= MAX_HISTORY_ITEMS) return items;
      return items.slice(-MAX_HISTORY_ITEMS);
    },
    [],
  );

  const historyPayload = useMemo(() => buildHistoryPayload(session), [buildHistoryPayload, session]);

  const handleQuestions = useCallback((payload: QuestionsPayload, guideSnapshot: string) => {
    const normalizedPayload = normalizeQuestionsPayload(payload) as QuestionsPayload;

    // Hard limit: force end after too many groups
    if (questionGroupsRef.current.length >= HARD_GROUP_LIMIT) {
      if (process.env.NODE_ENV === "development") {
        console.log("[session] hard limit reached, forcing completion");
      }
      setGuideText(guideSnapshot);
      guideTextRef.current = guideSnapshot;
      setIsComplete(true);
      setCurrentGroup(null);
      setCurrentAnswers([]);
      return;
    }

    // Filter empty question groups
    if (!normalizedPayload.questions || normalizedPayload.questions.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("[session] empty questions received, retrying");
      }
      setPendingRetry(true);
      return;
    }

    const groupId =
      typeof normalizedPayload.groupId === "string" && normalizedPayload.groupId.length > 0
        ? normalizedPayload.groupId
        : `group_${Date.now()}`;
    const existingIds = new Set(questionGroupsRef.current.map((group) => group.id));
    let uniqueId = groupId;
    if (existingIds.has(uniqueId)) {
      uniqueId = `${groupId}_${Date.now()}`;
    }
    const newGroup: QuestionGroup = normalizeQuestionGroup({
      id: uniqueId,
      createdAt: new Date().toISOString(),
      questions: normalizedPayload.questions ?? [],
    });
    newGroup.guideText = guideSnapshot;

    const completionHint = COMPLETION_PHRASES.some((pattern) => pattern.test(guideSnapshot));
    if (questionGroupsRef.current.length >= SOFT_GROUP_LIMIT && completionHint) {
      setGuideText(guideSnapshot);
      guideTextRef.current = guideSnapshot;
      setIsComplete(true);
      setCurrentGroup(null);
      setCurrentAnswers([]);
      return;
    }

    const nextSignature = buildGroupSignature(newGroup.questions);
    const existingSignatures = new Set(
      questionGroupsRef.current.map((group) => buildGroupSignature(group.questions)),
    );
    if (existingSignatures.has(nextSignature)) {
      if (!repeatGuardRef.current || repeatGuardRef.current.signature !== nextSignature) {
        repeatGuardRef.current = { signature: nextSignature, count: 1 };
      } else {
        repeatGuardRef.current.count += 1;
      }
      if (repeatGuardRef.current.count <= 1) {
        if (process.env.NODE_ENV === "development") {
          console.log("[session] duplicate group detected, retrying", uniqueId);
        }
        setPendingRetry(true);
        return;
      }
      setError("errors.repeat_group");
      setShowRetry(true);
      return;
    }

    repeatGuardRef.current = null;
    const updated = {
      ...sessionRef.current,
      questionGroups: [...questionGroupsRef.current, newGroup],
    };
    onSessionUpdate(updated);
    questionGroupsRef.current = updated.questionGroups;
    sessionRef.current = updated;

    setCurrentGroupIndex(updated.questionGroups.length - 1);
    setCurrentGroup(newGroup);
    setCurrentAnswers([]);
    setGuideText(guideSnapshot);
    guideTextRef.current = guideSnapshot;
    if (process.env.NODE_ENV === "development") {
      console.log("[session] new group", newGroup.id);
    }
  }, [onSessionUpdate]);

  const runRequest = useCallback(
    async (
      action: "start" | "answer" | "retry",
      input?: string,
      historyOverride?: Array<{ question: string; answer: string | string[] | number | boolean }>,
    ) => {
      if (!enabled) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsLoading(true);
      setError(null);
      setShowRetry(false);

      const shouldClearGuide = action !== "answer";
      if (shouldClearGuide) {
        setGuideText("");
        guideTextRef.current = "";
      } else {
        guideTextRef.current = "";
      }

      let receivedQuestions = false;
      let receivedEnd = false;
      let shouldReplaceText = action === "answer";

      try {
        const response = await fetch("/api/brainstorm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            input,
            template: session.template,
            language: session.language,
            history: historyOverride ?? historyPayload,
            action,
            turnstileToken: session.turnstileToken,
          }),
        });

        if (!response.ok) {
          if (response.status === 403) {
            try {
              const data = (await response.json()) as unknown;
              const code =
                data && typeof data === "object" ? (data as { code?: unknown }).code : null;
              if (code === "TURNSTILE_EXPIRED") {
                setError("errors.verification_expired");
                setShowRetry(false);
                return;
              }
            } catch {
              // ignore
            }
          }

          setError("errors.fetch_failed");
          setShowRetry(true);
          return;
        }

        await readSse(response, (payload: SsePayload) => {
          if (payload.type === "text" && typeof payload.data === "string") {
            setGuideText((prev) => {
              const base = shouldReplaceText ? "" : prev;
              const next = base + payload.data;
              shouldReplaceText = false;
              guideTextRef.current = next;
              return next;
            });
          }
          if (payload.type === "questions") {
            receivedQuestions = true;
            retryCountRef.current = 0;
            setError(null);
            const sanitized = sanitizeGuideText(guideTextRef.current);
            guideTextRef.current = sanitized;
            setGuideText(sanitized);
            handleQuestions(payload.data as QuestionsPayload, sanitized);
          }
          if (payload.type === "end") {
            receivedEnd = true;
            retryCountRef.current = 0;
            setIsComplete(true);
            setCurrentGroup(null);
            setCurrentAnswers([]);
          }
          if (payload.type === "error") {
            const raw = String(payload.data ?? "Unknown error");
            const mapped =
              raw === "Failed to parse tool output"
                ? "errors.parse_failed"
                : raw === "Streaming error"
                  ? "errors.stream_failed"
                  : raw;
            setError(mapped);
          }
        });

        if (!receivedQuestions && !receivedEnd) {
          if (action !== "retry" && retryCountRef.current < 1) {
            retryCountRef.current += 1;
            setPendingRetry(true);
            return;
          }
          setError((prev) => prev ?? "errors.no_questions");
          setShowRetry(true);
        }
      } catch {
        setError("errors.fetch_failed");
        setShowRetry(true);
      } finally {
        setIsLoading(false);
        inFlightRef.current = false;
      }
    },
    [
      enabled,
      handleQuestions,
      historyPayload,
      session.id,
      session.language,
      session.template,
      session.turnstileToken,
    ],
  );

  useEffect(() => {
    if (!pendingRetry) return;
    if (inFlightRef.current) return;
    setPendingRetry(false);
    runRequest("retry");
  }, [pendingRetry, runRequest]);

  const startIfNeeded = useCallback(() => {
    if (!enabled) return;
    if (isLoading) return;
    if (pendingRetry) return;
    if (showRetry || error) return;
    if (session.questionGroups.length === 0) {
      runRequest("start", session.initialInput);
      return;
    }

    const incompleteIndex = findFirstIncompleteGroup(session.questionGroups, session.answers);
    if (incompleteIndex >= 0) {
      const group = session.questionGroups[incompleteIndex];
      if (currentGroupIndex === incompleteIndex && currentGroup?.id === group.id) return;
      setCurrentGroupIndex(incompleteIndex);
      setCurrentGroup(group);
      setCurrentAnswers(getAnswersForGroup(group, session.answers));
      setGuideText(group.guideText ?? "");
      guideTextRef.current = group.guideText ?? "";
      return;
    }

    if (session.status === "active" && !isComplete) {
      runRequest("answer");
    }
  }, [
    currentGroup,
    currentGroupIndex,
    enabled,
    error,
    isComplete,
    isLoading,
    pendingRetry,
    runRequest,
    session,
    showRetry,
  ]);

  useEffect(() => {
    startIfNeeded();
  }, [startIfNeeded]);

  const updateAnswer = useCallback((answer: Answer) => {
    setCurrentAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== answer.questionId);
      return [...filtered, answer];
    });
  }, []);

  const submitCurrent = useCallback(async () => {
    if (!currentGroup) return false;
    const validation = validateGroup(currentGroup.questions, currentAnswers);
    if (!validation.valid) return false;

    const mergedAnswers = session.answers.filter(
      (a) => !currentGroup.questions.some((q) => q.id === a.questionId),
    );
    const nextAnswers = [...mergedAnswers, ...currentAnswers];

    const updated: Session = {
      ...session,
      answers: nextAnswers,
      updatedAt: new Date().toISOString(),
    };
    onSessionUpdate(updated);

    if (isConfirmationGroup(currentGroup, nextAnswers)) {
      setCurrentGroup(null);
      setCurrentGroupIndex(updated.questionGroups.length);
      setCurrentAnswers([]);
      setIsComplete(true);
      return true;
    }

    const nextIndex = currentGroupIndex + 1;
    if (nextIndex < updated.questionGroups.length) {
      const group = updated.questionGroups[nextIndex];
      setCurrentGroupIndex(nextIndex);
      setCurrentGroup(group);
      setCurrentAnswers(getAnswersForGroup(group, updated.answers));
      setGuideText(group.guideText ?? "");
      guideTextRef.current = group.guideText ?? "";
      return true;
    }

    // Clear current group to show skeleton while loading next questions
    setCurrentGroup(null);
    setCurrentAnswers([]);
    const historyOverride = buildHistoryPayload({ ...updated, answers: nextAnswers }, nextAnswers);
    await runRequest("answer", undefined, historyOverride);
    return true;
  }, [buildHistoryPayload, currentAnswers, currentGroup, currentGroupIndex, onSessionUpdate, runRequest, session]);

  const goBack = useCallback(() => {
    if (currentGroupIndex <= 0) return;
    const nextIndex = currentGroupIndex - 1;
    const group = session.questionGroups[nextIndex];
    setCurrentGroupIndex(nextIndex);
    setCurrentGroup(group);
    setCurrentAnswers(getAnswersForGroup(group, session.answers));
    setGuideText(group.guideText ?? "");
    guideTextRef.current = group.guideText ?? "";
    setIsComplete(false);
  }, [currentGroupIndex, session.answers, session.questionGroups]);

  const retry = useCallback(() => {
    runRequest("retry");
  }, [runRequest]);

  return {
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
  };
}
