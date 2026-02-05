"use client";

import Link from "next/link";
import type { Session } from "@/types/session";
import { useI18n } from "@/hooks/useI18n";

interface HistoryListProps {
  sessions: Session[];
  onDelete: (id: string) => void;
  continueLabel: string;
  viewLabel: string;
  deleteLabel: string;
}

export function HistoryList({ sessions, onDelete, continueLabel, viewLabel, deleteLabel }: HistoryListProps) {
  const { withLang } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold">{session.title}</p>
            <p className="text-xs text-[var(--app-secondary-foreground)]">
              {new Date(session.updatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              className="text-xs text-[var(--app-secondary-foreground)] hover:text-[var(--app-primary-foreground)]"
              onClick={() => onDelete(session.id)}
            >
              {deleteLabel}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
