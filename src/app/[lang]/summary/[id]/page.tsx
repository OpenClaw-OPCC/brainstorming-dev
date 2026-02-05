"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/summary/MarkdownEditor";
import { MarkdownPreview } from "@/components/summary/MarkdownPreview";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/hooks/useI18n";
import { summaryToMarkdown } from "@/lib/markdown";
import { useHydrated } from "@/hooks/useHydrated";

export default function SummaryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, withLang } = useI18n();
  const { getSession, updateSession, ready } = useLocalStorage();
  const hydrated = useHydrated();
  const session = useMemo(() => {
    if (!ready) return undefined;
    return getSession(params.id);
  }, [getSession, params.id, ready]);

  const baseMarkdown = useMemo(() => {
    if (!session) return "";
    return session.summaryEdited ?? (session.summary ? summaryToMarkdown(session.summary) : "");
  }, [session]);
  const [markdown, setMarkdown] = useState(baseMarkdown);

  useEffect(() => {
    if (!session) return;
    if (markdown === baseMarkdown) return;
    updateSession({ ...session, summaryEdited: markdown });
  }, [baseMarkdown, markdown, session, updateSession]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("summary.title")}</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("common.not_found")}</p>
        <button
          className="text-sm text-[var(--app-claude-orange)]"
          onClick={() => router.push(withLang("/"))}
        >
          {t("common.go_home")}
        </button>
      </main>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title || "summary"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("summary.title")}</h1>
        <div className="flex gap-2">
          <button
            className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-3 py-1 text-xs"
            onClick={handleCopy}
          >
            {t("summary.copy")}
          </button>
          <button
            className="rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] px-3 py-1 text-xs"
            onClick={handleDownload}
          >
            {t("summary.download")}
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-[var(--app-secondary-foreground)]">{t("summary.editor")}</span>
          <MarkdownEditor value={markdown} onChange={setMarkdown} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-[var(--app-secondary-foreground)]">{t("summary.preview")}</span>
          <MarkdownPreview value={markdown} />
        </div>
      </div>
    </main>
  );
}
