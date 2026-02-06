"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    plausible?: (event: string, options?: Record<string, unknown>) => void;
  }
}

export function PlausibleTracker() {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    // Only run analytics in production. Keeping dev/test clean avoids noise.
    if (process.env.NODE_ENV !== "production") return;

    // Plausible script triggers the initial pageview automatically; avoid double-counting.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    if (typeof window === "undefined") return;
    if (typeof window.plausible !== "function") return;

    window.plausible("pageview");
  }, [pathname]);

  return null;
}
