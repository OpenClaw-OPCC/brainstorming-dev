import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("/api/summary input validation", () => {
  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error?: unknown };
    expect(data.error).toBe("Invalid JSON");
  });

  it("returns 400 for invalid payloads", async () => {
    const req = new Request("http://localhost/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error?: unknown };
    expect(data.error).toBe("Validation failed");
  });
});

