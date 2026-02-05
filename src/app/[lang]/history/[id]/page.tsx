"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { HistoryDetail } from "@/components/history/HistoryDetail";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/hooks/useI18n";
import { useHydrated } from "@/hooks/useHydrated";

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getSession, ready } = useLocalStorage();
  const { withLang, t } = useI18n();
  const hydrated = useHydrated();

  const session = useMemo(() => {
    if (!ready) return undefined;
    return getSession(params.id);
  }, [getSession, params.id, ready]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("history.title")}</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("history.not_found")}</p>
        <button
          className="text-sm text-[var(--app-claude-orange)]"
          onClick={() => router.push(withLang("/history"))}
        >
          {t("history.back")}
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <HistoryDetail session={session} />
    </main>
  );
}
