"use client";

import { useEffect, useRef } from "react";
import { getLeaveConfirmState, setLeaveConfirmState } from "@/lib/leaveConfirmState";

type LeaveConfirmationOptions = {
  enabled: boolean;
  message: string;
};

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function shouldIgnoreHref(href: string) {
  return (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  );
}

export function useLeaveConfirmation({ enabled, message }: LeaveConfirmationOptions) {
  const ignoreNextPopRef = useRef(false);

  useEffect(() => {
    setLeaveConfirmState({ enabled, message });
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const st = getLeaveConfirmState();
      if (!st.enabled) return;
      event.preventDefault();
      // Required for Chrome; message is ignored by modern browsers.
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const st = getLeaveConfirmState();
      if (!st.enabled) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return; // left click only
      if (isModifiedClick(event)) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;

      const targetAttr = anchor.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || shouldIgnoreHref(hrefAttr)) return;

      // If it's the same document (including hash-only navigation), don't prompt.
      try {
        const url = new URL(hrefAttr, window.location.href);
        const isSameDocument =
          url.origin === window.location.origin &&
          url.pathname === window.location.pathname &&
          url.search === window.location.search;
        if (isSameDocument) return;
      } catch {
        // If we can't parse it as a URL, let the browser handle it.
        return;
      }

      const ok = window.confirm(st.message || "Are you sure you want to leave this page?");
      if (ok) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      const st = getLeaveConfirmState();
      if (!st.enabled) return;
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }

      const ok = window.confirm(st.message || "Are you sure you want to leave this page?");
      if (ok) return;

      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      // Best-effort: users almost always trigger this via "Back".
      ignoreNextPopRef.current = true;
      history.go(1);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState, true);
      setLeaveConfirmState({ enabled: false, message: "" });
    };
  }, [enabled, message]);
}

