export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  options?: { logPrefix?: string },
): Promise<boolean> {
  const logPrefix = options?.logPrefix ? `[${options.logPrefix}]` : "[turnstile]";

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error(`${logPrefix} Turnstile verification HTTP error`, { status: response.status });
      return false;
    }

    const result = (await response.json()) as { success?: unknown; "error-codes"?: unknown };
    const success = result?.success === true;
    if (!success) {
      const errorCodes = Array.isArray(result?.["error-codes"])
        ? (result["error-codes"] as unknown[]).filter((c): c is string => typeof c === "string")
        : undefined;
      console.warn(`${logPrefix} Turnstile verification rejected`, { errorCodes });
    }
    return success;
  } catch (error) {
    console.error(`${logPrefix} Turnstile verification failed`, error);
    return false;
  }
}

