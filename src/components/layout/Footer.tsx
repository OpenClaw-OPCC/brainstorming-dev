"use client";

import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";

export function Footer() {
  const { withLang, t } = useI18n();

  return (
    <footer className="mt-16 border-t border-[var(--app-header-border)] bg-[var(--app-footer-background)] px-6 py-10 text-[var(--app-header-foreground)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href={withLang("/")} className="text-lg font-semibold tracking-[0.08em]">
            {t("header.brand")}
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/OpenClaw-OPCC/brainstorming-dev"
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-[0.2em] text-[var(--app-header-muted)] hover:text-[var(--app-header-foreground)]"
            >
              GitHub
            </a>
            <a
              href="https://x.com/bourneliu66"
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-[0.2em] text-[var(--app-header-muted)] hover:text-[var(--app-header-foreground)]"
            >
              {t("footer.x")}
            </a>
          </div>
        </div>
        <div className="text-[11px] text-[var(--app-header-muted)]">
          {t("footer.by")}
        </div>
      </div>
    </footer>
  );
}
