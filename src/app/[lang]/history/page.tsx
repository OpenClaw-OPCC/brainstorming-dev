"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/hooks/useI18n";
import { HistoryList } from "@/components/history/HistoryList";
import { useHydrated } from "@/hooks/useHydrated";

export default function HistoryPage() {
  const { sessions, deleteSession } = useLocalStorage();
  const { t } = useI18n();
  const hydrated = useHydrated();

  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [sessions]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold">{t("history.title")}</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <h1 className="text-xl font-semibold">{t("history.title")}</h1>
      {sortedSessions.length === 0 ? (
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("history.empty")}</p>
      ) : (
        <HistoryList
          sessions={sortedSessions}
          onDelete={deleteSession}
          continueLabel={t("history.continue")}
          viewLabel={t("history.view")}
          deleteLabel={t("history.delete")}
        />
      )}
    </main>
  );
}
