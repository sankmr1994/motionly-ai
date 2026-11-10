# Codex start here

Read `PROJECT_STATUS.md` and `README.md` before changing the project.

The POC and Phase 0 foundation are complete. The next approved implementation milestone is Phase 1: the Porcelain Cobalt design system and public homepage only. Do not begin authentication, the dashboard, Instagram integration, or recurring schedules until their phase is explicitly approved.

Preserve the declarative video safety boundary: model output must pass the Zod storyboard contract and map only to registered animation templates/actions. Never execute generated code.

Before every milestone:

1. State the concrete user-visible outcome.
2. Keep credentials local and redacted.
3. Add or update tests for contract/timeline behavior.
4. Run `pnpm verify` and the relevant render check when video code changes.
5. Update `PROJECT_STATUS.md` with work completed, files changed, results, blockers, decisions, and the next action.

Do not call paid APIs, install external infrastructure, deploy, or connect production services unless the user explicitly approves that step.
