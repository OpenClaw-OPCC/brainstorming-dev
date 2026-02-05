"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Answer, Question, QuestionGroup } from "@/types/question";
import type { Session } from "@/types/session";
import { readSse, SsePayload } from "@/lib/sse";
import { validateGroup } from "@/lib/validation";
import { normalizeQuestionsPayload, normalizeQuestionGroup } from "@/lib/questions";

interface UseSessionEngineOptions {
  session: Session;
  onSessionUpdate: (session: Session) => void;
  enabled?: boolean;
}

interface QuestionsPayload {
  groupId: string;
  questions: Question[];
}

const COMPLETION_PHRASES = [
  /可以开始实现/gi,
  /准备结束/gi,
  /结束头脑风暴/gi,
  /已经收集足够/gi,
  /可以开始/gi,
  /ready to end/gi,
  /end the brainstorming/gi,
  /we have enough information/gi,
  /you can start implementing/gi,
];

const CONFIRMATION_PATTERNS = [
  /以上需求.*正确/gi,
  /需求总结.*正确/gi,
  /确认.*需求/gi,
  /confirm.*requirements/gi,
  /is the above.*correct/gi,
  /summary.*correct/gi,
];

const SOFT_GROUP_LIMIT = 6;
const HARD_GROUP_LIMIT = 10;

function sanitizeGuideText(text: string) {
  return COMPLETION_PHRASES.reduce((acc, pattern) => acc.replace(pattern, ""), text);
}

function findFirstIncompleteGroup(groups: QuestionGroup[], answers: Answer[]) {
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    const result = validateGroup(group.questions, answers.filter((a) => group.questions.some((q) => q.id === a.questionId)));
    if (!result.valid) return i;
  }
  return -1;
}

function getAnswersForGroup(group: QuestionGroup | null, answers: Answer[]) {
  if (!group) return [];
  const ids = new Set(group.questions.map((q) => q.id));
  return answers.filter((a) => ids.has(a.questionId));
}

function serializeAnswer(question: Question, answer: Answer): string {
  if (question.type === "multi" && Array.isArray(answer.value)) {
    const base = answer.value.join(", ");
    return answer.customText ? `${base} (${answer.customText})` : base;
  }
  if (typeof answer.value === "boolean") return answer.value ? "Yes" : "No";
  const base = String(answer.value ?? "");
  return answer.customText ? `${base} (${answer.customText})` : base;
}

function buildGroupSignature(questions: Question[]) {
  return JSON.stringify(
    questions.map((question) => ({
      type: question.type,
      title: question.title.trim().toLowerCase(),
      question: question.question.trim().toLowerCase(),
      options: (question.options ?? []).map((opt) => opt.label.trim().toLowerCase()),
    })),
  );
}

function isConfirmationQuestion(question: Question) {
  const text = `${question.title} ${question.question}`.toLowerCase();
  return CONFIRMATION_PATTERNS.some((pattern) => pattern.test(text));
}

function answerIsYes(question: Question, answer: Answer | undefined) {
  if (!answer) return false;
  if (typeof answer.value === "boolean") return answer.value;
  const raw = String(answer.value ?? "").toLowerCase();
  if (["yes", "true", "是", "正确", "完全正确"].some((value) => raw.includes(value))) return true;
  if (question.options) {
    const option = question.options.find((opt) => opt.id === answer.value);
    if (option) {
      const label = option.label.toLowerCase();
      if (["yes", "true", "是", "正确", "完全正确"].some((value) => label.includes(value))) return true;
    }
  }
  return false;
}

function isConfirmationGroup(group: QuestionGroup, answers: Answer[]) {
  const relevant = group.questions.filter((q) => isConfirmationQuestion(q));
  if (relevant.length === 0) return false;
  return relevant.every((question) => answerIsYes(question, answers.find((a) => a.questionId === question.id)));
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
      return sessionLike.questionGroups
        .flatMap((group) =>
          group.questions.map((question) => {
            const answer = answers.find((a) => a.questionId === question.id);
            if (!answer) return null;
            return {
              question: question.question,
              answer: serializeAnswer(question, answer),
            };
          }),
        )
        .filter(Boolean) as Array<{ question: string; answer: string | string[] | number | boolean }>;
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
          }),
        });

        if (!response.ok) {
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
    [enabled, handleQuestions, historyPayload, session.id, session.language, session.template],
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

    // Keep current group visible while loading next questions
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
