# Motionly AI — Project status and implementation handoff

> **Read this file first.** It is the source of truth for what Motionly is, what is implemented, what is only designed, and what should be built next.

Last updated: **2026-11-11**
Current implementation phase: **Phase 3 — Dashboard and project foundation implemented**
Next planned phase: **Phase 4 — Idea-to-storyboard workflow, after Phase 3 approval**

## 1. Product summary

Motionly AI helps a non-technical creator turn a simple idea into a narrated, captioned, animated vertical video. The creator can review the plan, generate the video, download it, publish an approved video to Instagram, or configure a recurring review-first/automatic publishing schedule.

V1 is creator-first and Instagram-first. Billing, subscriptions, payments, and internal credit systems are intentionally excluded.

## 2. Status at a glance

| Phase                    | Scope                                                                            | Status                                                      |
| ------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Product and architecture | PRD, system, API, database, Instagram integration, brand direction               | Complete                                                    |
| Video proof of concept   | Solar eclipse, compound interest, binary search                                  | Complete and verified                                       |
| Phase 0                  | Monorepo foundation, configuration, database adapter, health checks, logging, CI | Complete                                                    |
| Phase 1                  | Porcelain Cobalt design system and public homepage                               | Approved, implemented, and browser-verified                 |
| Phase 2                  | Email/password authentication, verification, recovery, and onboarding            | Core flow implemented; live recovery delivery check remains |
| Phase 3                  | Dashboard and project management                                                 | Foundation implemented; product-owner visual review pending |
| Phase 4                  | Idea-to-storyboard workflow                                                      | POC components exist; product workflow not implemented      |
| Phase 5                  | Production video-generation pipeline                                             | POC complete; hosted asynchronous pipeline not implemented  |
| Phase 6                  | Completed-video experience                                                       | Designed; not implemented                                   |
| Phase 7                  | Manual Instagram publishing and one-time scheduling                              | Designed; not implemented                                   |
| Phase 8                  | Recurring content generation and publishing                                      | Designed; not implemented                                   |
| Phase 9                  | Production hardening and launch                                                  | Not started                                                 |

## 3. Phase 0 completed work

Phase 0 preserves the working video POCs and adds the production application foundation:

- pnpm/TypeScript monorepo with strict shared compiler settings
- Next.js web application and existing Remotion preview
- typed, server-only environment validation in `packages/config`
- official MongoDB driver adapter in `packages/db`
- forward-only migration runner and migration registry
- JSON structured logger and propagated request IDs in `packages/observability`
- `GET /api/health/live` liveness endpoint
- `GET /api/health/ready` dependency-readiness endpoint
- local MongoDB Docker Compose definition
- GitHub Actions CI for format, typecheck, tests, and production build
- one-command local verification through `pnpm verify`
- expanded `.env.example` with current and reserved future settings

Phase 0 deliberately did **not** implement Better Auth, Inngest, R2, Sentry, or production database collections. Those belong to later feature phases. The homepage was added in Phase 1.

## 4. Verification record

Verified on **2026-11-10**:

- `pnpm install`: passed; lockfile updated and supply-chain policy check passed
- `pnpm format:check`: passed
- `pnpm typecheck`: all seven workspace packages passed
- `pnpm test`: 5 tests passed across config and shared contracts
- `pnpm build`: Next.js production build passed
- `/api/health/live`: returned `200` with a request ID
- `/api/health/ready`: correctly returned `503` and a safe database configuration message because MongoDB is not configured on this machine

Environment note: Docker is not installed on the current machine, so the provided local MongoDB container and a successful `ready` response were not runtime-tested. Do not install Docker or connect to Atlas without product-owner approval and appropriate credentials.

Atlas connectivity check on **2026-11-10**:

- `.env.local` contains a structurally valid `mongodb+srv` Atlas URI and `MONGODB_DB_NAME=motionly`.
- The local/ISP resolver did not work reliably with Node's SRV lookup. Motionly now supports `MONGODB_DNS_SERVERS`, matching the proven Make My Marriage connection approach.
- `.env.local` uses Cloudflare public DNS for Atlas SRV resolution; credentials and hostnames remain private.
- `pnpm --filter @motionly/db check` passed: the driver connected to Atlas, selected the `motionly` database, and received a successful ping.

Phase 1 homepage verification on **2026-11-10**:

- Replaced the dark POC landing screen with the selected light Porcelain Cobalt homepage.
- Implemented the storyboard/timeline hero, Describe → Direct → Publish workflow, three proven POC examples, template showcase, quality/guardrail section, final CTA, and responsive footer.
- Added responsive desktop, tablet, and mobile layouts plus `prefers-reduced-motion` behavior and visible keyboard focus states.
- Browser QA passed at 1440 × 900 and 390 × 844 with no horizontal overflow or console errors.
- In-page demo navigation successfully scrolls to the product preview.
- `pnpm verify` passed: formatting, all seven workspace type checks, 5 tests, and the optimized Next.js production build.

Phase 2 authentication work started on **2026-11-10**:

- Added Better Auth email/password registration with mandatory email verification and MongoDB persistence.
- Added Resend-backed verification and password-reset delivery; no email provider credentials are committed.
- Added sign-up, sign-in, verification notice, forgot-password, reset-password, onboarding, sign-out, and protected dashboard experiences.
- Onboarding captures name, content category, preferred language, publishing goal, and an automatically detected IANA timezone.
- Updated homepage calls to action to begin registration and added a responsive Porcelain Cobalt authentication experience.
- Reused the approved Resend configuration from MakeMyMarriage, normalized its verified-domain sender address, and generated a separate high-entropy Motionly Better Auth secret in ignored `.env.local`.
- Production build, signup-page browser QA, and the local Better Auth session endpoint passed. A live verification-email send and full account-flow test remain pending.
- Refined the authentication experience against Stitch screen `01 Sign in / Welcome`: centered welcome card, contained form panel, three-step explainer, trust copy, Porcelain Cobalt spacing, and responsive mobile composition.
- Fixed the homepage Sign in link hover state and added an accessible Show/Hide password control. Desktop/mobile browser QA passed with no horizontal overflow; password visibility interaction passed.

Phase 3 dashboard and project foundation implemented on **2026-11-11**:

- Replaced the temporary dark dashboard with the approved light Porcelain Cobalt studio shell used by Stitch screen 03, including desktop sidebar, mobile navigation, user profile controls, and responsive workspace header.
- Added a guided dashboard empty state, functional Create Video entry points, success feedback, and a persisted Recent Projects grid.
- Added the Stitch-aligned Create New Video screen with Idea and Full Script modes, prompt examples, 30/45/60-second duration choices, Instagram Reel defaults, Aditi voice summary, and caption defaults.
- Added strict shared Zod contracts for project creation, input modes, project states, and allowlisted video defaults.
- Added owner-scoped MongoDB project repositories. Draft creation atomically writes a mutable `projects` record and immutable revision 1 in `projectVersions` inside a MongoDB transaction.
- Added authenticated `GET` and `POST /api/v1/projects` route handlers with problem-details errors, validation, bounded list limits, and owner isolation.
- Added forward-only project indexes and applied migration `001-project-foundation-indexes` successfully to the configured Atlas database.
- Added project-contract and owner-filter tests; an empty owner is rejected before a database query can run.
- Type checking, 10 automated tests, the Next.js production build, migration, liveness endpoint, protected dashboard redirect, and unauthenticated project API response passed.
- Windows browser automation could not complete the final authenticated visual pass because its safety layer could not verify the active localhost URL. The production preview remains available for product-owner review; this is a QA constraint, not an application build failure.

## 5. Existing validated video POCs

The repository already proves the deterministic rendering approach with three narrated vertical videos:

- **Solar eclipse:** five reusable animated scenes and synchronized captions
- **Compound interest:** reusable number flow, formula, chart, and comparison visuals
- **Binary search:** reusable array, midpoint, range-elimination, success, and complexity visuals

The safety boundary is non-negotiable: model output is data, never executable code. Storyboards must pass the Zod contract and may reference only registered templates/actions.

Generated media is local-only under `out/` and `storage/` and must remain uncommitted.

## 6. Approved architecture

- Web/control plane: Next.js on Vercel
- Language/workspace: TypeScript + pnpm
- Authentication: Better Auth email/password with verification, Resend delivery, and MongoDB adapter (Phase 2)
- Metadata: MongoDB Atlas through the official driver and repository interfaces
- Durable workflows: Inngest (Phase 5)
- Media storage: private Cloudflare R2 with signed access (Phase 5)
- Rendering: Remotion worker; Remotion Lambda is a later measured scaling option
- AI planning: Gemini with configurable model identifier
- Voice: ElevenLabs; configured local voice is **Motionly Indian Educator**
- Monitoring: structured logs now; Sentry integration later

Canonical documents:

- `docs/Motionly_AI_PRD_v1.2_Approved.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/API_DESIGN.md`
- `docs/DATABASE_DESIGN.md`
- `docs/INSTAGRAM_INTEGRATION_DESIGN.md`
- `docs/BRAND_DIRECTIONS.md`

## 7. Repository map

```text
apps/web                 Next.js web/control-plane application
packages/ai              Gemini and ElevenLabs adapters
packages/config          Typed server environment configuration
packages/db              MongoDB connection and migrations
packages/observability   Structured logging and request context
packages/shared          Provider-independent contracts and fixtures
packages/video           Deterministic Remotion compositions
infrastructure           Local/deployment infrastructure definitions
docs                     Product, architecture, API, and database documents
storage                  Ignored local generated assets
out                      Ignored rendered videos
```

## 8. Local commands

```bash
pnpm install
pnpm verify
pnpm dev
```

Optional local MongoDB, after Docker is installed:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
pnpm --filter @motionly/db migrate
```

Copy `.env.example` to `.env.local` and supply local values. Never print, commit, paste into chat, or include credentials in logs.

## 9. Open decisions and known gaps

- MongoDB Atlas is configured and connectivity-tested locally; production deployment configuration remains deferred.
- Remotion licensing must be confirmed before commercial production launch.
- The production Gemini model remains environment-configurable and must be confirmed against account availability and quotas.
- Better Auth and the initial project repositories are wired. Inngest workflows, R2 storage, and Sentry remain deferred to their planned phases.
- Instagram publishing requires an eligible Creator or Business account and Meta app review; it is design-only today.
- Stitch screens 01–18 are approved. The public homepage is implemented; authenticated product screens remain design-only.

## 10. Exact next action

Product owner reviews the authenticated dashboard, responsive navigation, Create New Video screen, and saved-draft project card. Address any design-fidelity feedback before beginning Phase 4. After approval, implement Gemini-backed topic/script planning as a durable, validated idea-to-storyboard workflow; do not add narration or rendering in that slice.

## 11. Update protocol for future developers and agents

After every implementation milestone, update this file in the same change:

1. Change the current and next phase at the top.
2. Update the status table.
3. Record implemented behavior, not intentions.
4. Record exact verification commands and results.
5. Record blockers, deferred work, and important decisions.
6. State one concrete next action.
7. Never mark a designed feature as implemented.
