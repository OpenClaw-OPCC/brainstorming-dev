import { describe, expect, it } from "vitest";
import { summaryToMarkdown } from "@/lib/markdown";
import type { Summary } from "@/types/summary";

const summary: Summary = {
  overview: "Overview text",
  features: [{ name: "Feature A", description: "Desc", priority: "high" }],
  technicalPlan: "Use Next.js",
  interactions: "Flow",
  risks: [{ description: "Risk", mitigation: "Mitigate", severity: "medium" }],
  openQuestions: ["Open"],
  generatedAt: new Date().toISOString(),
};

describe("summaryToMarkdown", () => {
  it("formats markdown sections", () => {
    const md = summaryToMarkdown(summary);
    expect(md).toContain("# Requirements Summary");
    expect(md).toContain("## Overview");
    expect(md).toContain("## Features");
    expect(md).toContain("Feature A");
    expect(md).toContain("## Risks");
  });
});
