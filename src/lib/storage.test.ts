import { describe, expect, it } from "vitest";
import { pruneState, estimateSize, defaultState, createSession } from "@/lib/storage";
import type { Session } from "@/types/session";

function makeSession(id: string, size: number): Session {
  const payload = "x".repeat(size);
  const now = new Date().toISOString();
  return {
    id,
    title: payload,
    initialInput: payload,
    status: "active",
    language: "en",
    createdAt: now,
    updatedAt: now,
    questionGroups: [],
    answers: [],
  };
}

describe("storage pruning", () => {
  it("prunes sessions when size exceeds limit", () => {
    const bigSessions = [
      makeSession("1", 1024 * 1024),
      makeSession("2", 1024 * 1024),
      makeSession("3", 1024 * 1024),
      makeSession("4", 1024 * 1024),
      makeSession("5", 1024 * 1024),
    ];

    const state = { ...defaultState, sessions: bigSessions };
    expect(estimateSize(state)).toBeGreaterThan(4 * 1024 * 1024);

    const pruned = pruneState(state);
    expect(pruned.sessions.length).toBeLessThan(bigSessions.length);
  });

  it("creates session from initial input", () => {
    const input = "我要一个与众不同的贪吃蛇";
    const session = createSession(` ${input} `, undefined, "zh");
    expect(session.initialInput).toBe(input);
    expect(session.title.length).toBeGreaterThan(0);
  });
});
