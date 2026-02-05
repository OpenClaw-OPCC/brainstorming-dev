"use client";

import Link from "next/link";
import type { Session } from "@/types/session";
import { useI18n } from "@/hooks/useI18n";

interface HistoryListProps {
  sessions: Session[];
  title: string;
  emptyLabel: string;
  continueLabel: string;
  viewLabel: string;
}

export function HistoryList({ sessions, title, emptyLabel, continueLabel, viewLabel }: HistoryListProps) {
  const { withLang } = useI18n();
  return (
    <div className="flex w-full flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--app-primary-foreground)]">{title}</h2>
      {sessions.length === 0 ? (
        <p className="text-xs text-[var(--app-secondary-foreground)]">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{session.title}</span>
                <span className="text-xs text-[var(--app-secondary-foreground)]">
                  {new Date(session.updatedAt).toLocaleString()}
                </span>
              </div>
              {session.status === "active" ? (
                <Link
                  href={withLang(`/session/${session.id}`)}
                  className="text-xs font-semibold text-[var(--app-claude-orange)]"
                >
                  {continueLabel}
                </Link>
              ) : (
                <Link
                  href={withLang(`/history/${session.id}`)}
                  className="text-xs font-semibold text-[var(--app-claude-orange)]"
                >
                  {viewLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
