import { describe, expect, it } from "vitest";
import {
  issueTurnstilePass,
  TURNSTILE_PASS_TTL_SECONDS,
  verifyTurnstilePass,
} from "@/lib/turnstilePass";

describe("turnstile pass", () => {
  it("issues and verifies a valid pass", () => {
    const secret = "test-secret";
    const now = 1_700_000_000;
    const value = issueTurnstilePass(secret, now);
    const result = verifyTurnstilePass(value, secret, now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.iat).toBe(now);
      expect(result.payload.exp).toBe(now + TURNSTILE_PASS_TTL_SECONDS);
    }
  });

  it("rejects expired pass", () => {
    const secret = "test-secret";
    const now = 1_700_000_000;
    const value = issueTurnstilePass(secret, now);
    const result = verifyTurnstilePass(value, secret, now + TURNSTILE_PASS_TTL_SECONDS + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("expired");
    }
  });

  it("rejects tampered pass", () => {
    const secret = "test-secret";
    const now = 1_700_000_000;
    const value = issueTurnstilePass(secret, now);
    const last = value.slice(-1);
    const tampered = value.slice(0, -1) + (last === "a" ? "b" : "a");
    const result = verifyTurnstilePass(tampered, secret, now);
    expect(result.ok).toBe(false);
  });

  it("rejects missing pass", () => {
    const secret = "test-secret";
    const result = verifyTurnstilePass(null, secret, 1_700_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing");
    }
  });
});
