import crypto from "node:crypto";

export const TURNSTILE_PASS_COOKIE_NAME = "turnstile_pass";
export const TURNSTILE_PASS_TTL_SECONDS = 10 * 60;

type PassPayload = {
  v: 1;
  iat: number; // issued at (unix seconds)
  exp: number; // expires at (unix seconds)
};

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function sign(payloadB64: string, secret: string) {
  const digest = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return base64UrlEncode(digest);
}

export function issueTurnstilePass(secret: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload: PassPayload = {
    v: 1,
    iat: nowSeconds,
    exp: nowSeconds + TURNSTILE_PASS_TTL_SECONDS,
  };

  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export type VerifyTurnstilePassResult =
  | { ok: true; payload: PassPayload }
  | { ok: false; reason: "missing" | "invalid" | "expired" };

export function verifyTurnstilePass(
  cookieValue: string | null | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifyTurnstilePassResult {
  if (!cookieValue) return { ok: false, reason: "missing" };
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return { ok: false, reason: "invalid" };

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return { ok: false, reason: "invalid" };

  const expected = sign(payloadB64, secret);
  try {
    const a = Buffer.from(signatureB64);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as unknown;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!payload || typeof payload !== "object") return { ok: false, reason: "invalid" };
  const exp = (payload as { exp?: unknown }).exp;
  const iat = (payload as { iat?: unknown }).iat;
  const v = (payload as { v?: unknown }).v;

  if (v !== 1 || typeof exp !== "number" || typeof iat !== "number") return { ok: false, reason: "invalid" };
  if (!Number.isFinite(exp) || !Number.isFinite(iat)) return { ok: false, reason: "invalid" };

  if (nowSeconds > exp) return { ok: false, reason: "expired" };

  return { ok: true, payload: { v: 1, iat, exp } };
}

export function getCookieFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (key !== name) continue;
    return part.slice(eq + 1);
  }
  return null;
}

export function buildPassSetCookieHeader(value: string, isProd: boolean) {
  const base = [
    `${TURNSTILE_PASS_COOKIE_NAME}=${value}`,
    `Max-Age=${TURNSTILE_PASS_TTL_SECONDS}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isProd) {
    base.push("Secure");
  }

  return base.join("; ");
}

