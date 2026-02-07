import {
  buildPassSetCookieHeader,
  getCookieFromHeader,
  issueTurnstilePass,
  TURNSTILE_PASS_COOKIE_NAME,
  verifyTurnstilePass,
} from "@/lib/turnstilePass";
import { verifyTurnstileToken } from "@/lib/turnstileVerify";

export type TurnstileEnforcementResult =
  | {
      ok: true;
      isTurnstileEnabled: boolean;
      shouldEnforceTurnstile: boolean;
      secretKey: string | null;
      isProd: boolean;
      setPassCookieHeader: string | null;
    }
  | { ok: false; response: Response };

export async function enforceTurnstilePassCookie(
  request: Request,
  options: { logPrefix: string; skipPass?: boolean; turnstileToken?: string | null | undefined },
): Promise<TurnstileEnforcementResult> {
  const isTurnstileExplicitlyDisabled =
    process.env.TURNSTILE_DISABLED === "1" ||
    process.env.TURNSTILE_DISABLED === "true" ||
    process.env.DISABLE_TURNSTILE === "1" ||
    process.env.DISABLE_TURNSTILE === "true";

  const isTurnstileEnabled =
    !isTurnstileExplicitlyDisabled && process.env.NEXT_PUBLIC_ENABLE_TURNSTILE !== "false";
  const secretKey = process.env.TURNSTILE_SECRET_KEY ?? null;
  const isProd = process.env.NODE_ENV === "production";
  const shouldEnforceTurnstile = isTurnstileEnabled && Boolean(secretKey);

  if (isTurnstileEnabled && !secretKey) {
    if (isProd) {
      console.error(`[${options.logPrefix}] Turnstile is enabled but TURNSTILE_SECRET_KEY is missing`);
      return {
        ok: false,
        response: Response.json({ error: "Turnstile is enabled but not configured" }, { status: 500 }),
      };
    }
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[${options.logPrefix}] TURNSTILE_SECRET_KEY not configured, skipping verification in development`,
      );
    }
  }

  const skipPass = options.skipPass === true;
  if (shouldEnforceTurnstile && !skipPass) {
    const passValue = getCookieFromHeader(request.headers.get("cookie"), TURNSTILE_PASS_COOKIE_NAME);
    const passResult = verifyTurnstilePass(passValue, secretKey as string);
    if (!passResult.ok) {
      const token = options.turnstileToken;
      if (typeof token === "string" && token.trim().length > 0) {
        const ok = await verifyTurnstileToken(token, secretKey as string, {
          logPrefix: options.logPrefix,
        });
        if (ok) {
          return {
            ok: true,
            isTurnstileEnabled,
            shouldEnforceTurnstile,
            secretKey,
            isProd,
            setPassCookieHeader: buildPassSetCookieHeader(
              issueTurnstilePass(secretKey as string),
              isProd,
            ),
          };
        }
      }

      if (process.env.NODE_ENV !== "test") {
        console.warn(`[${options.logPrefix}] Turnstile pass cookie rejected`, {
          reason: passResult.reason,
          tokenProvided: typeof token === "string" && token.trim().length > 0,
        });
      }
      return {
        ok: false,
        response: Response.json(
          { error: "Verification expired. Please restart.", code: "TURNSTILE_EXPIRED" },
          { status: 403 },
        ),
      };
    }
  }

  return {
    ok: true,
    isTurnstileEnabled,
    shouldEnforceTurnstile,
    secretKey,
    isProd,
    setPassCookieHeader: null,
  };
}
