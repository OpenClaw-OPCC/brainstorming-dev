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

        <div className="flex items-center gap-2 text-xs text-[var(--app-header-muted)]">
          <div className="relative">
            <label htmlFor="ui-language" className="sr-only">
              {t("common.language")}
            </label>
            <select
              id="ui-language"
              className="h-8 appearance-none rounded-full border border-[var(--app-header-border)] bg-[var(--app-header-background)] px-3 pr-8 text-[11px] uppercase tracking-[0.2em] text-[var(--app-header-foreground)] outline-none focus:border-[var(--app-claude-orange)]"
              value={language}
              onChange={(event) => setLanguage(event.target.value as typeof language)}
            >
              <option value="en">EN</option>
              <option value="zh">中文</option>
            </select>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-header-muted)]"
            >
              <path
                d="M7 10l5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--app-header-border)] bg-[var(--app-header-background)] text-[var(--app-header-foreground)] outline-none transition-colors hover:bg-[var(--app-header-pill)] focus-visible:ring-2 focus-visible:ring-[var(--app-claude-orange)]/40"
            onClick={toggle}
            aria-label={theme === "dark" ? t("common.light") : t("common.dark")}
            title={theme === "dark" ? t("common.light") : t("common.dark")}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
