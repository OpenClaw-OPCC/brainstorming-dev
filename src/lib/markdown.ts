import type { Summary } from "@/types/summary";

export function summaryToMarkdown(summary: Summary): string {
  const lines: string[] = [];
  lines.push(`# Requirements Summary`);
  lines.push("");
  lines.push("## Overview");
  lines.push(summary.overview || "-");
  lines.push("");

  lines.push("## Features");
  if (summary.features.length === 0) {
    lines.push("- None");
  } else {
    summary.features.forEach((feature) => {
      lines.push(`- **${feature.name}** (${feature.priority}) — ${feature.description}`);
    });
  }
  lines.push("");

  if (summary.technicalPlan) {
    lines.push("## Technical Plan");
    lines.push(summary.technicalPlan);
    lines.push("");
  }

  if (summary.interactions) {
    lines.push("## Interactions");
    lines.push(summary.interactions);
    lines.push("");
  }

  lines.push("## Risks");
  if (summary.risks.length === 0) {
    lines.push("- None");
  } else {
    summary.risks.forEach((risk) => {
      lines.push(`- **${risk.severity}** — ${risk.description}`);
      lines.push(`  - Mitigation: ${risk.mitigation}`);
    });
  }
  lines.push("");

  lines.push("## Open Questions");
  if (summary.openQuestions.length === 0) {
    lines.push("- None");
  } else {
    summary.openQuestions.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }
  lines.push("");

  return lines.join("\n");
}
