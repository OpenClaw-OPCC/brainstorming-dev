import type { Session, TemplateType } from "@/types/session";
import { normalizeSession } from "@/lib/questions";
import { v4 as uuid } from "uuid";

export interface AppState {
  schemaVersion: number;
  uiLanguage: "en" | "zh";
  sessions: Session[];
}

const STORAGE_KEY = "brainstorming_sessions";
const SCHEMA_VERSION = 1;
const MAX_STORAGE_BYTES = 4 * 1024 * 1024;

export const defaultState: AppState = {
  schemaVersion: SCHEMA_VERSION,
  uiLanguage: "en",
  sessions: [],
};

function safeParse(raw: string | null): AppState {
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || typeof parsed !== "object") return defaultState;
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    return {
      schemaVersion: parsed.schemaVersion ?? SCHEMA_VERSION,
      uiLanguage: parsed.uiLanguage === "zh" ? "zh" : "en",
      sessions: sessions.map((session) => normalizeSession(session)),
    };
  } catch {
    return defaultState;
  }
}

export function estimateSize(state: AppState): number {
  return JSON.stringify(state).length;
}

export function pruneState(state: AppState): AppState {
  if (estimateSize(state) <= MAX_STORAGE_BYTES) return state;

  const sorted = [...state.sessions].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  );

  let sessions = [...sorted];
  while (sessions.length > 1 && estimateSize({ ...state, sessions }) > MAX_STORAGE_BYTES) {
    sessions.shift();
  }

  if (estimateSize({ ...state, sessions }) > MAX_STORAGE_BYTES && sessions.length > 1) {
    sessions = sessions.slice(-1);
  }

  return { ...state, sessions };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

export function saveState(state: AppState): AppState {
  if (typeof window === "undefined") return state;
  const next = pruneState(state);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function createSession(input: string, template: TemplateType | undefined, language: "en" | "zh", turnstileToken?: string): Session {
  const now = new Date().toISOString();
  const trimmed = input.trim();
  const fallbackTitle = trimmed.length > 32 ? `${trimmed.slice(0, 32)}…` : trimmed;
  return {
    id: uuid(),
    title: fallbackTitle,
    initialInput: trimmed,
    status: "active",
    language,
    template,
    createdAt: now,
    updatedAt: now,
    questionGroups: [],
    answers: [],
    turnstileToken,
  };
}

export function upsertSession(state: AppState, session: Session): AppState {
  const sessions = state.sessions.filter((s) => s.id !== session.id);
  sessions.unshift({ ...session, updatedAt: new Date().toISOString() });
  return { ...state, sessions };
}

export function deleteSession(state: AppState, id: string): AppState {
  return { ...state, sessions: state.sessions.filter((s) => s.id !== id) };
}

export function getSession(state: AppState, id: string): Session | undefined {
  return state.sessions.find((s) => s.id === id);
}
