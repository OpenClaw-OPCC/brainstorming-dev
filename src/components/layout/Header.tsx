"use client";

import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";
import { useTheme } from "@/hooks/useTheme";

export function Header() {
  const { language, setLanguage, t, withLang } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <header className="border-b border-[var(--app-header-border)] bg-[var(--app-header-background)] text-[var(--app-header-foreground)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-5">
          <Link href={withLang("/")} className="flex items-center gap-3 text-lg font-semibold tracking-[0.08em]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-claude-orange)]/15 text-[var(--app-claude-orange)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M8 6.2c-2.6.9-4.4 3.3-4.4 6.1 0 4.6 3.7 8.5 8.4 9.7 4.7-1.2 8.4-5.1 8.4-9.7 0-2.8-1.8-5.2-4.4-6.1"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M6.2 9.2c-1.7-.5-3.2-1.6-4.2-3.3M17.8 9.2c1.7-.5 3.2-1.6 4.2-3.3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M8.8 11.6c-1.1-1.3-1.3-2.9-.5-4.2M15.2 11.6c1.1-1.3 1.3-2.9.5-4.2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <path
                  d="M9 15.4h6M9.5 17.6l2.5 2 2.5-2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10.2" cy="8.9" r="0.7" fill="currentColor" />
                <circle cx="13.8" cy="8.9" r="0.7" fill="currentColor" />
              </svg>
            </span>
            <span className="uppercase">{t("header.brand")}</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-[var(--app-header-muted)] md:flex">
            <Link href={withLang("/")} className="hover:text-[var(--app-header-foreground)]">
              {t("header.nav.home")}
            </Link>
            <Link href={withLang("/history")} className="hover:text-[var(--app-header-foreground)]">
              {t("header.nav.history")}
            </Link>
            <Link
              href={withLang("/#templates")}
              className="text-[11px] uppercase tracking-[0.24em] text-[var(--app-header-muted)] hover:text-[var(--app-header-foreground)]"
            >
              {t("header.nav.templates")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--app-header-muted)]">
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-[11px] uppercase tracking-[0.2em]">{t("common.language")}</span>
            <div className="flex items-center rounded-full border border-[var(--app-header-border)] p-0.5">
              <button
                className={`rounded-full px-2 py-1 text-[11px] ${language === "en" ? "bg-[var(--app-header-pill)] text-[var(--app-header-foreground)]" : ""}`}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
              <button
                className={`rounded-full px-2 py-1 text-[11px] ${language === "zh" ? "bg-[var(--app-header-pill)] text-[var(--app-header-foreground)]" : ""}`}
                onClick={() => setLanguage("zh")}
              >
                中文
              </button>
            </div>
          </div>
          <button
            className="rounded-full border border-[var(--app-header-border)] px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
            onClick={toggle}
          >
            {theme === "dark" ? t("common.dark") : t("common.light")}
          </button>
        </div>
      </div>
    </header>
  );
}
