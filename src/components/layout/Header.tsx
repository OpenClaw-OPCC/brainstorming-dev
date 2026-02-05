"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";
import { useTheme } from "@/hooks/useTheme";

export function Header() {
  const { language, setLanguage, t, withLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const setUiLanguage = (next: typeof language) => {
    setMenuOpen(false);
    setLanguage(next);
  };

  return (
    <header className="border-b border-[var(--app-header-border)] bg-[var(--app-header-background)] text-[var(--app-header-foreground)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-5">
          <Link
            href={withLang("/")}
            className="flex items-center gap-3 text-lg font-semibold tracking-[0.08em]"
            onClick={() => setMenuOpen(false)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--app-claude-orange)] text-white" aria-hidden>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {/* 左脑轮廓 */}
                <path
                  d="M12 3C9 3 7 4 6 6C4 6 3 8 3 10C3 12 4 13 4 15C4 17 6 20 10 21C11 21 12 21 12 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 右脑轮廓 */}
                <path
                  d="M12 3C15 3 17 4 18 6C20 6 21 8 21 10C21 12 20 13 20 15C20 17 18 20 14 21C13 21 12 21 12 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* 中线 */}
                <path d="M12 3V21" stroke="currentColor" strokeWidth="1.5" />
                {/* 左脑褶皱 */}
                <path d="M8 8C7 9.5 7 12 8 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5.5 11C6.5 12 7.5 12 8.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                {/* 右脑褶皱 */}
                <path d="M16 8C17 9.5 17 12 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M18.5 11C17.5 12 16.5 12 15.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <span
              className="uppercase text-[var(--app-claude-orange)]"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 'clamp(14px, 2.5vw, 18px)',
                letterSpacing: '0.02em',
                textShadow: '2px 2px 0 rgba(224, 112, 78, 0.25)'
              }}
            >
              {t("header.brand")}
            </span>
          </Link>
        </div>

        {/* Desktop Controls */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Language Switcher - Button Group Style */}
          <fieldset className="flex h-9 items-center rounded-full bg-[var(--app-header-pill)] p-1">
            <legend className="sr-only">{t("common.language")}</legend>
            <label className="relative">
              <input
                type="radio"
                name="ui-lang-desktop"
                value="en"
                checked={language === "en"}
                onChange={() => setUiLanguage("en")}
                className="peer sr-only"
              />
              <span
                className={`relative inline-flex h-7 cursor-pointer select-none items-center rounded-full px-3 text-xs font-medium transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--app-claude-orange)]/40 ${
                  language === "en"
                    ? "bg-[var(--app-header-background)] text-[var(--app-header-foreground)] shadow-sm"
                    : "text-[var(--app-header-muted)] hover:text-[var(--app-header-foreground)]"
                }`}
              >
                EN
              </span>
            </label>
            <label className="relative">
              <input
                type="radio"
                name="ui-lang-desktop"
                value="zh"
                checked={language === "zh"}
                onChange={() => setUiLanguage("zh")}
                className="peer sr-only"
              />
              <span
                className={`relative inline-flex h-7 cursor-pointer select-none items-center rounded-full px-3 text-xs font-medium transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--app-claude-orange)]/40 ${
                  language === "zh"
                    ? "bg-[var(--app-header-background)] text-[var(--app-header-foreground)] shadow-sm"
                    : "text-[var(--app-header-muted)] hover:text-[var(--app-header-foreground)]"
                }`}
              >
                中文
              </span>
            </label>
          </fieldset>

          {/* Theme Toggle */}
          <button
            type="button"
            className="group inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-header-pill)] text-[var(--app-header-muted)] transition-all duration-200 hover:text-[var(--app-header-foreground)]"
            onClick={toggle}
            aria-label={theme === "dark" ? t("common.light") : t("common.dark")}
            title={theme === "dark" ? t("common.light") : t("common.dark")}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="transition-transform duration-200 group-hover:scale-110">
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <path
                  d="M12 5V3M12 21v-2M16.95 7.05l1.41-1.41M5.64 18.36l1.41-1.41M19 12h2M3 12h2M16.95 16.95l1.41 1.41M5.64 5.64l1.41 1.41"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="transition-transform duration-200 group-hover:scale-110">
                <path
                  d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Hamburger Menu */}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-header-foreground)] md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

        {/* Mobile Menu Dropdown */}
        {menuOpen && (
          <div className="border-t border-[var(--app-header-border)] bg-[var(--app-header-background)] px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              {/* Language Switcher */}
              <fieldset className="flex h-9 items-center rounded-full bg-[var(--app-header-pill)] p-1">
                <legend className="sr-only">{t("common.language")}</legend>
                <label className="relative">
                  <input
                    type="radio"
                    name="ui-lang-mobile"
                    value="en"
                    checked={language === "en"}
                    onChange={() => setUiLanguage("en")}
                    className="peer sr-only"
                  />
                  <span
                    className={`relative inline-flex h-7 cursor-pointer select-none items-center rounded-full px-3 text-xs font-medium transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--app-claude-orange)]/40 ${
                      language === "en"
                        ? "bg-[var(--app-header-background)] text-[var(--app-header-foreground)] shadow-sm"
                        : "text-[var(--app-header-muted)] hover:text-[var(--app-header-foreground)]"
                    }`}
                  >
                    EN
                  </span>
                </label>
                <label className="relative">
                  <input
                    type="radio"
                    name="ui-lang-mobile"
                    value="zh"
                    checked={language === "zh"}
                    onChange={() => setUiLanguage("zh")}
                    className="peer sr-only"
                  />
                  <span
                    className={`relative inline-flex h-7 cursor-pointer select-none items-center rounded-full px-3 text-xs font-medium transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--app-claude-orange)]/40 ${
                      language === "zh"
                        ? "bg-[var(--app-header-background)] text-[var(--app-header-foreground)] shadow-sm"
                        : "text-[var(--app-header-muted)] hover:text-[var(--app-header-foreground)]"
                    }`}
                  >
                    中文
                  </span>
                </label>
              </fieldset>

              {/* Theme Toggle */}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-header-pill)] text-[var(--app-header-muted)]"
                onClick={toggle}
                aria-label={theme === "dark" ? t("common.light") : t("common.dark")}
              >
                {theme === "dark" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path
                      d="M12 5V3M12 21v-2M16.95 7.05l1.41-1.41M5.64 18.36l1.41-1.41M19 12h2M3 12h2M16.95 16.95l1.41 1.41M5.64 5.64l1.41 1.41"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
          </div>
        </div>
      )}
    </header>
  );
}
