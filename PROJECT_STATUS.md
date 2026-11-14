# Motionly AI — Project status and implementation handoff

> **Read this file first.** It is the source of truth for what Motionly is, what is implemented, what is only designed, and what should be built next.

Last updated: **2026-11-14**
Current implementation phase: **Phase 5B — Caption timing, editing, and approval implemented locally**
Next planned phase: **Phase 5C — Deterministic visual timeline and video rendering**

## 1. Product summary

Motionly AI helps a non-technical creator turn a simple idea into a narrated, captioned, animated vertical video. The creator can review the plan, generate the video, download it, publish an approved video to Instagram, or configure a recurring review-first/automatic publishing schedule.

V1 is creator-first and Instagram-first. Billing, subscriptions, payments, and internal credit systems are intentionally excluded.

## 2. Status at a glance

| Phase                    | Scope                                                                            | Status                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Product and architecture | PRD, system, API, database, Instagram integration, brand direction               | Complete                                                                                        |
| Video proof of concept   | Solar eclipse, compound interest, binary search                                  | Complete and verified                                                                           |
| Phase 0                  | Monorepo foundation, configuration, database adapter, health checks, logging, CI | Complete                                                                                        |
| Phase 1                  | Porcelain Cobalt design system and public homepage                               | Approved, implemented, and browser-verified                                                     |
| Phase 2                  | Email/password authentication, verification, recovery, and onboarding            | Core flow implemented; live recovery delivery check remains                                     |
| Phase 3                  | Dashboard and project management                                                 | Complete and product-owner approved                                                             |
| Phase 4                  | Idea-to-storyboard workflow                                                      | Complete: generation, references, revision history, editing, review, regeneration, and approval |
| Phase 5                  | Production video-generation pipeline                                             | Phase 5A narration complete; Phase 5B caption review implemented; rendering pending             |
| Phase 6                  | Completed-video experience                                                       | Designed; not implemented                                                                       |
| Phase 7                  | Manual Instagram publishing and one-time scheduling                              | Designed; not implemented                                                                       |
| Phase 8                  | Recurring content generation and publishing                                      | Designed; not implemented                                                                       |
| Phase 9                  | Production hardening and launch                                                  | Not started                                                                                     |

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
- Refined My Videos into a compact responsive library that scales from three columns on wide screens to one column on mobile, with separate Active and Archived views and a bounded 50-project page.
- Rebalanced the returning-user dashboard so the compact welcome header flows directly into My Videos and saved drafts are visible in the initial viewport. The large blue idea explainer now appears only for first-time users with no active projects; returning users receive a compact create-next-video prompt after their library.
- Added owner-scoped draft management: reopen and update the idea/script while preserving immutable revision history, rename, reversible archive/restore, and permanent draft deletion behind an explicit confirmation dialog. Matching authenticated metadata `PATCH` and draft-only `DELETE` APIs share the same validation rules.
- Fixed the studio navigation state so the cobalt selection follows My Videos or Create New Video on desktop and mobile instead of remaining pinned to My Videos.
- Type checking, 12 automated tests, the Next.js production build, migration, liveness endpoint, protected dashboard redirect, and unauthenticated project API responses passed.
- Signed-in desktop and narrow responsive browser QA confirmed that My Videos and the first draft card are visible without scrolling past an oversized onboarding panel.

Phase 4A idea-to-storyboard vertical slice implemented on **2026-11-12**:

- Added Gemini-backed scene planning for topic and full-script projects. Motionly deterministically compiles the AI scene content into registered templates, exact 30/45/60-second timing, allowlisted animation actions, and a strictly validated storyboard.
- Added durable owner-scoped planning jobs and safe project transitions from `DRAFT` or `REVIEW_READY` through `PLANNING` to `REVIEW_READY`; provider failures restore the prior safe project state.
- Added immutable planned project revisions with source lineage, generated script, storyboard, exact provider/model provenance, template-registry version, validation summary, frame count, and content hash.
- Added a combined storyboard review screen with scene narration, visual objects, motion actions, plan summary, factual-verification warning, regeneration, and explicit approval.
- Added storyboard revision history and safe current-version selection. A compact sidebar trigger opens a responsive history drawer with five newest-first revisions per page; selecting an older storyboard changes only the current-version pointer, creates no duplicate, preserves every version, and requires confirmation. Regeneration alone creates the next immutable revision, and approved projects remain locked.
- Added a final approval confirmation dialog and server-side confirmation guard so a single accidental click cannot lock a storyboard revision.
- Added Phase 4B storyboard editing: users can edit scene titles, narration, and existing visual labels, review a deterministic change summary, and save an owner-scoped immutable revision. Visual-label renames automatically update matching animation-action references. Server validation protects scene identity, schema, visual-object count, locked timing and render configuration, narration word limits, content hashes, and concurrent changes.
- Completed Phase 4B source grounding: the create flow accepts an optional trusted public HTTPS webpage, validates and stores it with immutable source lineage, requires successful Gemini URL Context retrieval plus an explicit idea-to-reference relevance assessment during planning, preserves it through regeneration and edits, and displays the grounded source during storyboard review. Unsafe, private/local, credential-bearing, unreadable, paywalled, unrelated, and provider-rejected URLs fail safely without producing an ungrounded storyboard.
- Added safe reference replacement from storyboard review. A replacement is checked against the current revision, URL retrieval and idea relevance must pass, and a valid storyboard must be produced before the new reference becomes part of a new immutable revision; any failure leaves the current revision and source unchanged.
- Added a responsive sticky review command bar so Edit, Approve, and Revision History are visible without scrolling to the end of the storyboard. Regeneration remains available under the secondary More menu, and reference changes live beside the trusted-source summary.
- Added atomic combined storyboard editing and reference replacement. The editor can stage a new trusted URL with scene changes, generate a temporary source-grounded candidate, overlay only the fields the user changed, validate the final storyboard, and persist exactly one new immutable revision. Failed retrieval, relevance, generation, edit compatibility, or concurrency checks leave the current revision unchanged.
- Added transactional approval that locks the reviewed content hash and moves the project to `APPROVED`; narration and video rendering remain intentionally out of scope.
- Added authenticated planning and approval API routes plus migration `002-planning-job-indexes`.
- Automated verification passed through the combined editing and safe reference-replacement Phase 4B slice: all workspace type checks, all 33 automated tests, formatting, diff validation, and the optimized Next.js production build. The configured Atlas migration runner passed in the earlier Phase 4A baseline.
- Live Gemini and browser verification passed on **2026-11-12**: `gemini-3.5-flash-lite` generated a valid five-scene, 30-second compound-interest plan, MongoDB saved immutable Revision 2, and the application navigated to the complete storyboard review screen. The revision was intentionally left unapproved for product-owner review.
- Live reference-grounding verification passed on **2026-11-14**: a fresh 45-second compound-interest draft used the public Investor.gov compound-interest glossary through Gemini URL Context, generated six valid scenes with source-grounded narration, persisted immutable Revision 2, and displayed both the `Reference-grounded plan` notice and trusted `investor.gov` source link on the review screen. The test revision remains unapproved.
- Live relevance-gate verification passed on **2026-11-14**: a compound-interest idea paired with an unrelated NASA eclipse reference was rejected with the user-facing mismatch message, the project returned safely to `DRAFT`, and no storyboard revision was created.
- Hardened provider/database reliability with a 90-second single-attempt Gemini deadline, one-minute interrupted-job recovery, safe failure cleanup, transient MongoDB retries, and a 15-second Atlas cold-start selection window.
- Adding/removing visual objects and changing templates or raw motion commands remain intentionally deferred beyond the safe V1 storyboard editor.

Phase 5A narration vertical slice implemented on **2026-11-14**:

- Added owner-scoped durable `narrationJobs` tied to the exact approved project version and approved content hash. Duplicate completed requests reuse the existing job, active requests are blocked, interrupted jobs become retryable, and provider failures never modify the approved storyboard.
- Added scene-by-scene ElevenLabs narration using the configured Motionly Indian Educator voice and `eleven_multilingual_v2`, with bounded provider requests, retained character-level timestamp alignment, timestamp-derived audio duration, safe errors, progress persistence, and retry handling.
- Added private local development media storage outside MongoDB and outside the public Next.js directory. Authenticated, owner-scoped audio routes stream MP3 bytes with range support; raw filesystem paths and provider credentials are never exposed.
- Added a Porcelain Cobalt narration studio for approved projects with generation/progress/failure states, per-scene native audio controls, a sequential full-narration player, voice/model metadata, and a direct handoff from the approved storyboard.
- Promoted the approved storyboard's `Continue to narration` action into the responsive sticky command bar so the next workflow step is immediately visible and remains accessible while the user scrolls. The duplicate bottom-of-sidebar action was removed.
- Added migration `003-narration-job-indexes` plus readiness and speech-metadata regression tests. The automated suite now contains 37 passing tests.
- Local end-to-end verification passed on **2026-11-14**: an approved six-scene storyboard generated real ElevenLabs audio in about eight seconds, stored six private MP3 assets, streamed every scene through authenticated byte-range responses, displayed 47.6 seconds of combined audio, and successfully started and paused sequential full-narration playback.
- Final Phase 5A verification passed: formatting, all workspace type checks, all 37 automated tests, diff validation, and the optimized Next.js production build.
- The current request execution is synchronous while the durable job remains the source of truth. Inngest execution and private Cloudflare R2 storage remain required before production deployment; R2 credentials are not configured in the current local environment.

Phase 5B caption review vertical slice implemented on **2026-11-14**:

- Added deterministic phrase-level caption compilation from retained ElevenLabs character timestamps. No additional AI or speech-provider request is required, and completed Phase 5A narration jobs are safely backfilled on first caption review.
- Added bounded shared caption contracts for cue identity, protected start/end timing, review status, optimistic versioning, and three allowlisted styles: Minimal, Word Focus, and Social Bold.
- Added an owner-scoped caption review snapshot inside the exact completed narration job. Caption saves may change only bounded text and style; scene membership, cue IDs, audio timing, narration assets, and the approved storyboard remain immutable.
- Added optimistic concurrency, exact-current-approved-version checks, draft saving, and atomic staged-edit approval. Once approved, caption wording, style, and synchronized timing are locked for rendering without creating a storyboard revision or regenerating narration.
- Added a responsive Caption Timing Review screen with a stable-size caption preview, per-scene audio playback, live cue switching, editable phrase text, planned-versus-actual duration comparison, overrun warnings, sticky save/approval controls, and an approval confirmation dialog.
- Added a prominent `Review captions` next-step action to completed narration pages so users can continue without searching below the audio list.
- Automated verification passed: formatting, diff validation, all workspace type checks, all **44** tests, and the optimized Next.js production build. Caption-gap regression coverage ensures an earlier phrase is not repeated during silence between cues. Per the product owner's testing preference, signed-in browser QA was not run automatically.

Product UI and interaction guardrails confirmed during Phase 5B:

- Repeated cards and project items must be content-driven and compact. Do not use oversized fixed/minimum heights or layouts that leave avoidable blank regions; validate the design with many items, not only one.
- Timed previews must display content only inside the authoritative cue interval. Silence and timing gaps remain visually empty instead of falling back to an earlier or default caption.
- Future workflow steps must keep the next primary action visible without requiring the user to scroll to the bottom of a long page.

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
- Media storage: private local adapter for Phase 5A development; private Cloudflare R2 with signed access before production
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
- The production Gemini model remains environment-configurable. Live account verification currently supports and uses `gemini-3.5-flash-lite`; `gemini-2.5-flash-lite` is listed by the API but rejects new users and must not be selected.
- Better Auth, project repositories, durable local narration jobs, and caption review snapshots are wired. Inngest execution, R2 storage, and Sentry remain deferred to their planned production-hardening slices.
- Instagram publishing requires an eligible Creator or Business account and Meta app review; it is design-only today.
- Stitch screens 01–18 are approved. The public homepage is implemented; authenticated product screens remain design-only.

## 10. Exact next action

Begin Phase 5C by compiling the approved storyboard, narration assets, and approved caption timeline into a deterministic Remotion render input; render the first private vertical MP4 without allowing model-generated executable code.

## 11. Update protocol for future developers and agents

After every implementation milestone, update this file in the same change:

1. Change the current and next phase at the top.
2. Update the status table.
3. Record implemented behavior, not intentions.
4. Record exact verification commands and results.
5. Record blockers, deferred work, and important decisions.
6. State one concrete next action.
7. Never mark a designed feature as implemented.
