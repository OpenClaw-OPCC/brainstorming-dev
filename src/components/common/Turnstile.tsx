"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function Turnstile({ siteKey, onVerify, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const { theme } = useTheme();

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // Remove existing widget if theme changed
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    if (!siteKey) {
      console.error("Turnstile site key not configured");
      onError?.();
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      "expired-callback": onExpire,
      "error-callback": onError,
      theme: theme,
    });
  }, [onError, onExpire, onVerify, siteKey, theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScriptLoad = () => {
      renderWidget();
    };

    const handleScriptError = () => {
      onError?.();
    };

    if (window.turnstile) {
      renderWidget();
      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", handleScriptLoad);
    script.addEventListener("error", handleScriptError);

    return () => {
      script?.removeEventListener("load", handleScriptLoad);
      script?.removeEventListener("error", handleScriptError);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onError, renderWidget]);

  return <div ref={containerRef} className="flex justify-center" />;
}
