# STATUS.md — current task

**Goal:** Claude Haiku 5.5 runs every AI call in Tend (decided 2026-10-21, same decision in Compass and Ledger).

## Decisions
- Model `claude-haiku-5-5` via `CLAUDE_MODEL`; key env **`ANTHROPIC_API_KEY`** (SDK default, `new Anthropic()`). Package `@anthropic-ai/sdk` (same version as Compass, ^0.132.1).
- One key shared with Compass and Ledger; $5/month limit set in the Anthropic Console.
- Chain in `lib/ai.ts`: claude → azure → groq. **Gemini removed.**
- KR suggestions (`lib/suggest.ts`) use Claude structured output; "Looking back" (`lib/reflect.ts`) stays prose.
- A Claude `refusal` stop reason counts as an error, so the chain falls through.

## Steps
- [x] Claude provider first in `lib/ai.ts`, Gemini out
- [x] `suggest.ts` structured output on Claude
- [x] README AI section + CLAUDE.md (if it mentions AI) updated
- [x] Live test 2026-10-21: KR suggestion + weekly note on Claude (reflect via complete(), DB-writing path skipped). Build not re-run (no code change).
