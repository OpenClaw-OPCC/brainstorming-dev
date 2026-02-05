"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeInput } from "@/components/home/WelcomeInput";
import { TemplateCards } from "@/components/home/TemplateCards";
import { HistoryList } from "@/components/home/HistoryList";
import { templates } from "@/lib/templates";
import { useI18n } from "@/hooks/useI18n";
import { useHydrated } from "@/hooks/useHydrated";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { TemplateType } from "@/types/session";

export default function HomePage() {
  const router = useRouter();
  const { language, t, withLang } = useI18n();
  const { sessions, createSession } = useLocalStorage();
  const [input, setInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | undefined>(undefined);
  const hydrated = useHydrated();

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [sessions]);

  const handleSelectTemplate = (templateId: string, prompt: string) => {
    setSelectedTemplate(templateId as TemplateType);
    setInput(prompt);
  };

  const handleStart = (token: string) => {
    if (!input.trim()) return;
    setTurnstileToken(token);
    const session = createSession(input.trim(), selectedTemplate, language, token);
    router.push(withLang(`/session/${session.id}`));
  };

  if (!hydrated) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
          <p className="text-sm text-[var(--app-secondary-foreground)]">{t("home.subtitle")}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
        <p className="text-sm text-[var(--app-secondary-foreground)]">{t("home.subtitle")}</p>
      </section>

      <WelcomeInput
        value={input}
        placeholder={t("home.placeholder")}
        onChange={setInput}
        onStart={handleStart}
        startLabel={t("home.start")}
      />

      <TemplateCards
        templates={templates}
        title={t("home.templates")}
        getTitle={t}
        getDescription={t}
        getPrompt={t}
        onSelect={handleSelectTemplate}
      />

      <HistoryList
        sessions={sortedSessions}
        title={t("home.history")}
        emptyLabel={t("history.empty")}
        continueLabel={t("history.continue")}
        viewLabel={t("history.view")}
      />
    </main>
  );
}
