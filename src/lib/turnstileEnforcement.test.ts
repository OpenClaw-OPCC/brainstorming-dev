import { describe, expect, it, vi, afterEach } from "vitest";
import { enforceTurnstilePassCookie } from "@/lib/turnstileEnforcement";

const ENV_SNAPSHOT = { ...process.env };

afterEach(() => {
  process.env = { ...ENV_SNAPSHOT };
  vi.restoreAllMocks();
});

describe("enforceTurnstilePassCookie", () => {
  it("returns 403 when pass cookie is missing and no token is provided", async () => {
    process.env.NEXT_PUBLIC_ENABLE_TURNSTILE = "true";
    process.env.TURNSTILE_SECRET_KEY = "test_secret";

    const req = new Request("http://localhost/api/summary", { method: "POST" });
    const result = await enforceTurnstilePassCookie(req, { logPrefix: "test" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected enforcement failure");
    expect(result.response.status).toBe(403);
    const data = (await result.response.json()) as { code?: unknown };
    expect(data.code).toBe("TURNSTILE_EXPIRED");
  });

  it("refreshes pass cookie when a token is provided and verifies successfully", async () => {
    process.env.NEXT_PUBLIC_ENABLE_TURNSTILE = "true";
    process.env.TURNSTILE_SECRET_KEY = "test_secret";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const req = new Request("http://localhost/api/summary", { method: "POST" });
    const result = await enforceTurnstilePassCookie(req, {
      logPrefix: "test",
      turnstileToken: "token_value",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected enforcement success");
    expect(result.setPassCookieHeader).toContain("turnstile_pass=");
    expect(result.setPassCookieHeader).toContain("Max-Age=");
  });
});

