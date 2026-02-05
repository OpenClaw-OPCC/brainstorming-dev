"use client";

import { useCallback, useState } from "react";
import type { Session, TemplateType } from "@/types/session";
import {
  AppState,
  createSession as createSessionRecord,
  deleteSession as removeSession,
  getSession as findSession,
  loadState,
  saveState,
  upsertSession,
} from "@/lib/storage";

export function useLocalStorage() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [ready] = useState(true);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      return saveState(next);
    });
  }, []);

  const updateSession = useCallback(
    (session: Session) => {
      updateState((prev) => upsertSession(prev, session));
    },
    [updateState],
  );

  const deleteSession = useCallback(
    (id: string) => {
      updateState((prev) => removeSession(prev, id));
    },
    [updateState],
  );

  const createSession = useCallback(
    (input: string, template: TemplateType | undefined, language: "en" | "zh") => {
      const session = createSessionRecord(input, template, language);
      updateState((prev) => upsertSession(prev, session));
      return session;
    },
    [updateState],
  );

  const getSession = useCallback(
    (id: string) => {
      return findSession(state, id);
    },
    [state],
  );

  const updateUiLanguage = useCallback(
    (language: "en" | "zh") => {
      updateState((prev) => ({ ...prev, uiLanguage: language }));
    },
    [updateState],
  );

  return {
    ready,
    state,
    sessions: state.sessions,
    createSession,
    updateSession,
    deleteSession,
    getSession,
    updateUiLanguage,
  };
}
