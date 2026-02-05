"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import en from "@/i18n/en.json";
import zh from "@/i18n/zh.json";

export type UiLanguage = "en" | "zh";

const dictionaries = { en, zh } as const;

type Dictionary = (typeof dictionaries)[UiLanguage];

function getNestedValue(obj: Dictionary, path: string): string {
  const keys = path.split(".").filter(Boolean);
  let cur: unknown = obj as unknown;

  for (const key of keys) {
    if (cur && typeof cur === "object" && key in cur) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return "";
    }
  }

  return typeof cur === "string" ? cur : "";
}

function parsePathname(pathname: string): { language: UiLanguage; basePath: string } {
  const segments = pathname.split("/").filter(Boolean);
  const hasLang = segments[0] === "zh" || segments[0] === "en";
  const language: UiLanguage = segments[0] === "zh" ? "zh" : "en";
  const rest = hasLang ? segments.slice(1) : segments;
  const basePath = `/${rest.join("/")}`.replace(/\/$/, "") || "/";
  return { language, basePath };
}

export function useI18n() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, basePath } = parsePathname(pathname || "/");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const dict = useMemo(() => dictionaries[language], [language]);

  const t = useMemo(() => {
    return (path: string) => {
      const value = getNestedValue(dict, path);
      return value || path;
    };
  }, [dict]);

  const withLang = (path: string, target: UiLanguage = language) => {
    const normalized = path === "/" ? "" : path;
    return target === "zh" ? `/zh${normalized}` : normalized || "/";
  };

  const setLanguage = (next: UiLanguage) => {
    if (typeof document !== "undefined") {
      document.cookie = `ui_lang=${next}; path=/; max-age=31536000`;
    }
    router.push(withLang(basePath, next));
  };

  return { language, setLanguage, t, withLang, basePath };
}
