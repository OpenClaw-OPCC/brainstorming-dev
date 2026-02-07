"use client";

export type LeaveConfirmState = {
  enabled: boolean;
  message: string;
};

let state: LeaveConfirmState = { enabled: false, message: "" };

export function setLeaveConfirmState(next: LeaveConfirmState) {
  state = next;
}

export function getLeaveConfirmState(): LeaveConfirmState {
  return state;
}

export function confirmLeaveIfNeeded(messageOverride?: string): boolean {
  if (typeof window === "undefined") return true;
  if (!state.enabled) return true;
  const message =
    messageOverride ??
    state.message ??
    "Are you sure you want to leave this page?";
  return window.confirm(message);
}

