# AGENTS

This repository is **Brainstorming Dev**. Follow these rules when you work here.

## Non‑negotiables
- **Package manager:** use `pnpm` for all installs, scripts, and lockfile updates.
- **Testing:** run **unit tests** (`pnpm test`) and keep them passing.
- **Design direction:** UI must **closely match** the feel of **Claude Code for VS Code** and **claude.ai** (header, typography, spacing, contrast, and motion). Avoid generic UI.

## Quick Commands
- Dev server: `pnpm dev`
- Lint: `pnpm lint`
- Unit tests: `pnpm test`

## Design & UX Guidelines
- Match Claude’s visual language (quiet contrast, warm neutrals, precise typography).
- Keep the interface minimal and focused; avoid noisy UI.
- Light/Dark themes must both be first‑class and consistent across header/footer.
- Loading states should look intentional (skeletons, gentle motion), not like a stall.

## Architecture Notes
- App Router (Next.js).
- i18n is **route‑based**: English at `/`, Chinese at `/zh`.
- Language switch updates UI language only; AI language is fixed per session unless specified.
- Storage is **localStorage** only (no DB).

## AI Integration
- Uses Anthropic protocol (see `.env` for `ANTHROPIC_*`).
- Stream responses via SSE; questions may arrive in groups (tabbed UI).

## QA Checklist (before you say “done”)
- `pnpm lint` passes
- `pnpm test` passes
- Light/Dark: header + footer + cards are correct
- Tabs / multi‑select / Other input behave correctly
- Full flow: input → questions → summary → markdown export
