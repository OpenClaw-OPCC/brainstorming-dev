export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const turnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE !== "false";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;

  return Response.json(
    {
      turnstile: {
        enabled: turnstileEnabled,
        siteKey: turnstileSiteKey,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

