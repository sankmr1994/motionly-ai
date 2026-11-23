# Motionly AI — Project status and implementation handoff

> **Read this file first.** It is the source of truth for what Motionly is, what is implemented, what is only designed, and what should be built next.

Last updated: **2026-11-23**
Current implementation phase: **Phase 7 — manual Instagram Reel publishing implemented; live Meta verification pending**
Next planned phase: **Apply publication indexes, verify the connected test account, and publish one approved test Reel**

Latest video-quality and cost-control work (**2026-11-23**): V1 now defaults to the zero-marginal-cost `procedural` scene visual provider. Dedicated animated optics and transformer families provide topic-compatible rainbow/refraction and AI/attention scenes instead of unrelated reused diagrams. Public portfolio accounts are limited to three completed renders; configured administrators remain unlimited. The topic-specific Gemini 9:16 artwork pipeline is preserved behind the explicit `SCENE_VISUAL_PROVIDER=gemini` feature flag, caches generated assets by immutable revision and prompt hash in private R2, and is not enabled for V1. Migration `008` is only required if that future paid provider is enabled.

## 1. Product summary

Motionly AI helps a non-technical creator turn a simple idea into a narrated, captioned, animated vertical video. The creator can review the plan, generate the video, download it, publish an approved video to Instagram, or configure a recurring review-first/automatic publishing schedule.

V1 is creator-first and Instagram-first. Billing, subscriptions, payments, and internal credit systems are intentionally excluded.

## 2. Status at a glance

| Phase                    | Scope                                                                            | Status                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Product and architecture | PRD, system, API, database, Instagram integration, brand direction               | Complete                                                                                         |
| Video proof of concept   | Solar eclipse, compound interest, binary search                                  | Complete and verified                                                                            |
| Phase 0                  | Monorepo foundation, configuration, database adapter, health checks, logging, CI | Complete                                                                                         |
| Phase 1                  | Porcelain Cobalt design system and public homepage                               | Approved, implemented, and browser-verified                                                      |
| Phase 2                  | Email/password authentication, verification, recovery, and onboarding            | Core flow implemented; live recovery delivery check remains                                      |
| Phase 3                  | Dashboard and project management                                                 | Complete and product-owner approved                                                              |
| Phase 4                  | Idea-to-storyboard workflow                                                      | Complete: generation, references, revision history, editing, review, regeneration, and approval  |
| Phase 5                  | Production video-generation pipeline                                             | Complete locally: narration, captions, rendering, and private R2 media persistence               |
| Phase 6                  | Completed-video experience                                                       | Complete locally: R2 playback, confirmation, approval, and protected MP4 download                |
| Phase 7                  | Manual Instagram publishing and one-time scheduling                              | In progress: connection and confirmed manual Reel publishing implemented; live Meta test pending |
| Phase 8                  | Recurring content generation and publishing                                      | Designed; not implemented                                                                        |
| Phase 9                  | Production hardening and launch                                                  | Not started                                                                                      |

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
- Fixed project-card overflow menus so only the active card menu remains visible. Menus now dismiss on outside click, Escape, navigation, and immediately after choosing Archive or Restore.
- Extended confirmed permanent deletion beyond drafts to review-ready, approved, archived, and finished-video projects. The owner-scoped transaction removes versions and related planning, narration, caption, and render records; local narration/render assets are then purged. Active planning, narration, or rendering blocks deletion until processing finishes.
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
- The current request execution is synchronous while the durable job remains the source of truth. Inngest execution remains required before production deployment. Narration generated before the R2 milestone remains readable through the legacy private-local fallback.

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

Phases 5C and 6 video rendering and review implemented on **2026-11-14**:

- Added deterministic render compilation that combines the exact approved storyboard, completed per-scene narration assets, and approved caption cues. Each scene expands to the greater of its planned duration or actual narration duration so speech is never cut off.
- Added a registered generic visual fallback for allowlisted storyboard templates while preserving the existing specialized binary-search, finance, eclipse, and diagram compositions. Model output remains validated data and is never executed as code.
- Added durable owner-scoped `renderJobs` with input hashing, completed-render reuse, active-render blocking, interrupted-job recovery, retryable safe failures, progress, output metadata, and finished-video approval state.
- Added private MP4 persistence, authenticated owner-scoped byte-range streaming, and an approval-gated download response. Raw storage paths are not exposed.
- Added a visible `Generate video` handoff after caption approval, automatic render-status refresh, compact failure/retry handling, a private 9:16 finished-video player, output summary, approval confirmation, and MP4 download after approval.
- Upgraded the generic visual layer after product-owner review: title scenes use an animated concept orbit, definition scenes use a connected value flow, lists use readable staggered milestones, processes use moving pipeline indicators, and finance charts use source labels plus animated growth paths. This also fixes invisible white-on-white labels that previously left only `01`, `02`, and `03` markers visible.
- Replaced coarse fixed render progress with Remotion renderer callbacks. Durable job progress now follows actual bundling, frame rendering, encoding, and muxing from 5–99%, then moves to 100% only after the MP4 is safely recorded.
- Versioned the deterministic render pipeline so an older completed video is not silently reused after a motion-system upgrade. The review page offers `Render improved video` when its saved output came from an earlier pipeline.
- Added and applied migration `004-render-job-indexes` plus deterministic render-timeline/readiness regression tests. Automated verification passed with all workspace type checks, all **49** tests, and the optimized Next.js production build.
- Per the product owner's standing preference, signed-in browser QA and a live MP4 render were not run automatically. The first product-owner-triggered local render remains the final runtime confirmation for the installed browser/codec environment.
- Local request-triggered background execution remains a development adapter. Inngest execution is still required before production deployment.

Private Cloudflare R2 media storage implemented on **2026-11-15**:

- Created a dedicated private `motionly-ai-media` bucket and a least-privilege account token restricted to object read/write operations in that bucket only. Real credentials remain in ignored `.env.local`.
- Added typed all-or-nothing R2 environment validation, account-to-endpoint validation, the official S3-compatible client, and private object namespaces.
- Replaced opaque job-first folders with user-grouped, readable project keys: `users/{ownerId}/projects/{title-slug}--{projectId}/revision-{revision}/narration/{jobId}/{sceneId}.mp3` and the matching `video/{jobId}/motionly-video.mp4` path. The stable internal owner ID avoids exposing email addresses, Unicode titles are supported, and immutable IDs preserve uniqueness and reliable database mapping.
- New ElevenLabs scene audio uploads directly to R2. Remotion still uses a temporary local workspace, uploads the completed MP4 to R2 before the render job is marked complete, and removes the local workspace afterward.
- Authenticated owner-scoped audio and video endpoints support bounded, open-ended, and suffix byte ranges while keeping the bucket private. MongoDB remains the authoritative metadata store and contains object keys rather than media bytes.
- Project deletion and failed-generation cleanup remove matching R2 prefixes. Upload-before-database-completion failures remove the uploaded MP4 to avoid orphaned output.
- Added an idempotent legacy-media migration. The configured development database copied **12 narration assets and 3 completed MP4s** into readable project/revision keys and updated MongoDB references. Legacy R2 source objects and local rollback copies remain retained pending explicit deletion approval. The legacy reader remains available for unmigrated environments.
- Added `pnpm check:r2` for connection verification and `pnpm check:r2:storage` for a temporary upload, full read, byte-range read, and deletion contract check. Both passed against the configured bucket.
- Final verification passed: formatting, all workspace type checks, all **64** automated tests, the optimized Next.js production build, diff validation, ignored-secret checks, and the live R2 storage contract.
- Signed-in Chrome verification passed after the readable-key migration: a migrated 45-second video streamed and played with audio/captions, its approved 3.3 MB MP4 downloaded successfully, and Cloudflare displayed readable project-title folders. No legacy objects were deleted.
- On **2026-11-16**, all current media was copied once more into non-PII, user-grouped `users/{ownerId}/projects/...` keys. MongoDB references were updated for **12 narration assets and 3 videos**; an immediate repeat migrated **0/0**, proving idempotency. A live integrity audit confirmed **1 user folder**, correct owner prefixes, and successful byte-range reads for every referenced object. The earlier `projects/`, `narrations/`, and `renders/` copies remain retained pending explicit deletion approval.
- Added a protected `/admin/media` view on **2026-11-16**. A verified email allowlist controls access; ordinary users receive no navigation entry and cannot open the route. The compact view safely maps MongoDB account names/emails to stable, non-PII R2 owner prefixes and shows per-user project, narration, video, and byte totals. Its read-only live aggregation verified **1 user, 4 projects, 12 narration assets, and 3 videos**.
- Refined the media-admin view after storage-count review: archived/deleted projects are excluded; project rows separately expose storyboard, narration, and finished-video workflow state; and every referenced audio/MP4 is checked live with an R2 metadata request. The summary now distinguishes **video projects** from historical **MP4 files**. Live reconciliation found **4 active projects, 12 audio files, 2 video projects, 3 MP4 files, and 0 missing R2 objects**; one compound-interest project legitimately owns two render outputs.

Creator-discovery and video-library follow-up implemented on **2026-11-15**:

- Added on-demand AI topic discovery to Create Video. Suggestions are personalized from the authenticated user's saved category and language, grounded with live Google Search, and include visible source links; an ungrounded response is never labeled as trending.
- Added a three-hour owner-scoped MongoDB suggestion cache and a 15-minute manual-refresh cooldown to avoid repeated provider spend. Topic discovery never runs automatically during page load.
- Added direct finished-video workflow actions to every My Videos card using one owner-scoped batch query: View progress, Retry video, Review video, or Watch video. Users no longer need to traverse storyboard, narration, and captions to reopen a finished render.
- Added and applied migration `005-topic-suggestion-cache-indexes`. Provider quota errors now produce a specific safe message and fall back to the last cached topic set when one exists. Formatting, all workspace type checks, all **55** automated tests, and the optimized production build passed; signed-in browser testing was intentionally left to the product owner.
- Hardened topic discovery for hosted Gemini quota and availability failures on **2026-11-20**. Retryable `429`/`503`/`504` responses now try the configured fallback model; an existing owner cache remains the first fallback, and a curated six-item category/language-aware evergreen set keeps Create Video useful when no live cache exists. The UI clearly labels these as reliable starter ideas rather than falsely presenting them as current trends.
- Added a free-tier Gemini middle fallback: if Google Search grounding is unavailable, Motionly asks Gemini again without the search tool for six personalized evergreen ideas and explicitly forbids current/trending claims. The application-owned curated library is now only the final fallback when both grounded and ordinary Gemini generation are unavailable.

Phase 7A Instagram account-connection foundation implemented on **2026-11-19**:

- Added a first-class Settings destination and a compact Instagram connection card aligned to the existing Porcelain Cobalt studio. One Connect Instagram action opens Meta in a focused popup, returns the result to the original Settings page, and never exposes provider credential fields.
- Added authenticated OAuth start and callback routes for Meta Unified Login. Every attempt uses a cryptographically random, ten-minute, owner-bound, single-use state plus an HTTP-only SameSite cookie before a provider code is accepted.
- Added server-only Meta configuration validation for the App ID, App Secret, Unified Login configuration ID, exact HTTPS redirect URI, Graph version, and a separate 32-byte integration-encryption key. No real Meta credentials are committed.
- Added AES-256-GCM access-token encryption before MongoDB persistence. Connection responses expose only safe account/status metadata; tokens and Meta secrets never reach the browser.
- Added owner-scoped `socialConnections` and expiring `instagramOAuthStates` repositories plus migration `006-instagram-connection-indexes`. The migration is committed but its Atlas run remains pending because the remote runner did not complete within the bounded verification window.
- Added Facebook Graph account resolution with an Instagram Graph fallback so the callback can handle the currently selected Unified Login configuration and Instagram-only account responses without weakening owner isolation.
- Automated verification passed: all workspace type checks, all **69** tests, and the optimized Next.js production build. Manual signed-in browser testing was intentionally left to the product owner.
- Phase 1 stabilization is complete on the `develop` branch: the full Instagram foundation was reviewed, formatting passed, all workspace type checks passed, all **69** automated tests passed, and the optimized Next.js build exposed both OAuth routes and the Settings page successfully. No Meta credentials were added and migration `006` remains intentionally unapplied until the deployed HTTPS environment is configured.

Phase 7B confirmed manual Reel publishing implemented on **2026-11-23**:

- Added a deliberate Publish to Instagram action only for approved finished videos. A confirmation dialog names the connected account, explains that a real Reel will be created, allows caption editing, and lets the creator choose whether the Reel also appears in the Instagram feed.
- Added an owner-scoped durable publication record with encrypted connection-token access, provider container/media IDs, safe status/error handling, duplicate prevention, a 15-minute interrupted-attempt recovery boundary, and a permanent published-state record. Raw Meta access tokens never enter the browser or publication record.
- Added a short-lived, unguessable media-ingestion URL so Meta can retrieve only the exact approved private R2 MP4 during processing. The endpoint supports byte ranges, expires after 30 minutes, and stops serving after ingestion completes or fails.
- Added Reel media validation for Motionly's 720 × 1280 MP4 contract, duration, frame rate, and file size before any external request. Publishing follows Meta's container creation, processing-status, and `media_publish` sequence and stores the resulting permalink when available.
- Added the finished-video published state and direct View Reel link. When Instagram is not connected, the workflow links to Settings instead of exposing a broken publish action.
- Replaced repetitive My Videos artwork with deterministic topic-aware thumbnails. Rainbow, finance, search, habit, and general topics now receive distinct code-native illustrations and color palettes while drafts and completed videos retain the same compact card layout.
- Added migration `007-instagram-publication-indexes`; migrations `006` and `007` still require the configured Atlas run before live publishing verification.
- Verification passed for all changed-file formatting, all workspace type checks, all **78** automated tests, and the optimized Next.js production build. The first actual Instagram Reel was intentionally not published without product-owner approval.

Topic-compatible motion-graphics routing corrected on **2026-11-23**:

- Removed the renderer assumption that every generic `DIAGRAM` is a solar-eclipse scene and every `GROWTH_CHART` is a compound-interest scene. That defect caused unrelated videos, including AI-transformer explainers, to display Sun/Moon/Earth artwork and dollar-denominated charts.
- Added deterministic scene-domain classification for AI, space, finance, algorithms, nature, habits, and general concepts. Celestial compositions now require a genuine space topic, finance compositions require finance content, and binary-search compositions require an algorithm topic.
- Added data-driven semantic hero, relationship diagram, flow, comparison, and chart compositions. They animate the current scene's own objects and use domain-specific shape/color treatments instead of borrowing fixed POC content.
- Strengthened the Gemini scene-planning instruction with explicit semantic rules for titles, lists, timelines, processes, quantities, comparisons, diagrams, formulas, and charts. Charts and specialist imagery must now be justified by the scene content.
- Bumped the render pipeline to `2026-11-23.1`, so previously completed videos show the existing **Render improved video** action. Stored MP4s remain immutable; selecting that action creates a corrected render from the same approved storyboard, narration, and captions.
- Added routing regression tests proving that transformer diagrams cannot select celestial or finance graphics while intentional eclipse and compound-interest scenes retain their specialized families.
- Verification passed for all changed-file formatting, every workspace type check, all **80** automated tests, and the optimized Next.js production build. Manual signed-in browser review remains with the product owner.

Vercel deployment Phase 2 completed on **2026-11-19**:

- Added an app-scoped `apps/web/vercel.json` for the Next.js framework, frozen pnpm installation, standard app build/dev commands, and Fluid compute. The required Vercel project Root Directory is `apps/web`; no output-directory override is used.
- Added safe Vercel environment inference: Preview derives its stable branch origin and `APP_ENV=preview` from system variables, Production derives a fallback origin, and an explicit final `APP_URL` always wins. This keeps the future custom domain authoritative for Better Auth and external links.
- Added `docs/VERCEL_DEPLOYMENT.md` with exact import settings, Preview/Production variable separation, sensitive-value guidance, deployment gates, and post-deployment checks. Preview and Production use different Better Auth secrets and MongoDB database names; Meta credentials remain deferred until the final HTTPS callback exists.
- Added `.vercel/` to Git exclusions and confirmed that no deployment state or credentials are tracked.
- Vercel-root verification passed: `pnpm --dir apps/web install --frozen-lockfile --offline` detected all eight workspace projects, formatting passed, all workspace type checks passed, all **71** automated tests passed, and `pnpm --dir apps/web build` completed successfully with all expected routes.
- No Vercel project, deployment, domain, paid resource, or external environment setting was created in this phase. Production rendering still uses the local child-process development adapter and must be replaced before the first preview deployment is approved.

Vercel deployment Phase 3 completed on **2026-11-20**:

- Preserved the existing local child-process Remotion adapter for local/test environments and enforced detached Vercel Sandbox selection for Preview/Production. A local environment may explicitly select Sandbox for controlled diagnostics, but a hosted environment can never select the child-process adapter.
- Added durable Sandbox execution metadata to MongoDB render jobs. The existing three-second page refresh now reconciles genuine Sandbox progress, persists monotonic percentages, resumes safely after navigation, and prevents duplicate active renders.
- Added a private temporary Vercel Blob handoff because detached Remotion Sandbox rendering requires Blob output. Completed MP4s are copied into the existing readable owner/project/revision key in private Cloudflare R2; the temporary Blob is deleted and the Sandbox is stopped after successful finalization.
- Added retry handling for failed/expired Sandbox sessions, idempotent completion for concurrent status polls, a 50-minute durable-job stale boundary, and safe cleanup of partial R2 output. Approved storyboard, narration, and captions remain unchanged on failure.
- Added Hobby safeguards: 720 × 1280 H.264 output, two-vCPU Sandboxes, render concurrency two, a 40-minute detached timeout, a five-minute Server Action ceiling, and no automatic 1080p path.
- Added hosted render configuration for `VIDEO_RENDER_PROVIDER`, private `BLOB_READ_WRITE_TOKEN`, and `REMOTION_LICENSE_KEY`; no real credentials were committed. The Vercel deployment guide now records the exact lifecycle and environment requirements.
- Automated verification passed: repository formatting, all workspace type checks, all **74** automated tests, and the optimized Next.js production build. A live Sandbox render remains intentionally deferred until the first Vercel Preview project has OIDC, Blob, R2, and application environment values.

Vercel deployment Phase 4 progress on **2026-11-20**:

- Created the Vercel project with `apps/web` as its Root Directory and deployed `develop` successfully to Production at `https://motionly-ai.vercel.app`.
- Configured the application environment values as Vercel secrets and connected the private `motionly-ai-blob` store for the temporary Sandbox-to-R2 handoff. Meta credentials remain intentionally unset until the final custom domain is connected.
- Verified that the public production homepage loads and that authentication works on the canonical production origin. Vercel branch aliases are not canonical Better Auth origins and correctly fail origin validation.
- The Gemini topic-discovery resilience change passed formatting, all workspace type checks, all **76** automated tests, and the optimized production build. The build initially encountered a Windows sandbox junction restriction and passed unchanged when rerun with the required local filesystem permission.
- Full hosted narration, R2 playback, and one 720p Sandbox render remain product-owner validation gates before domain purchase and Meta integration.

## 5. Existing validated video POCs

The repository already proves the deterministic rendering approach with three narrated vertical videos:

- **Solar eclipse:** five reusable animated scenes and synchronized captions
- **Compound interest:** reusable number flow, formula, chart, and comparison visuals
- **Binary search:** reusable array, midpoint, range-elimination, success, and complexity visuals

The safety boundary is non-negotiable: model output is data, never executable code. Storyboards must pass the Zod contract and may reference only registered templates/actions.

POC and legacy generated media under `out/` and `storage/` remains local and uncommitted. New application narration and completed MP4 assets are private R2 objects; local render workspaces are temporary.

## 6. Approved architecture

- Web/control plane: Next.js on Vercel
- Language/workspace: TypeScript + pnpm
- Authentication: Better Auth email/password with verification, Resend delivery, and MongoDB adapter (Phase 2)
- Metadata: MongoDB Atlas through the official driver and repository interfaces
- Durable workflows: Inngest (Phase 5)
- Media storage: private Cloudflare R2 through authenticated owner-scoped application routes; legacy local assets remain readable during transition
- Rendering: local Remotion adapter during development; Vercel Sandbox is the approved Hobby deployment target; Remotion Lambda remains a later measured scaling option
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
pnpm check:r2
pnpm check:r2:storage
pnpm migrate:r2-media
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
- The Vercel production deployment and private Blob store are live at the free canonical `motionly-ai.vercel.app` origin. A custom domain is not connected, and one live hosted Sandbox render remains unverified.
- Remotion licensing must be confirmed before commercial production launch.
- The production Gemini model remains environment-configurable. Live account verification currently supports and uses `gemini-3.5-flash-lite`; `gemini-2.5-flash-lite` is listed by the API but rejects new users and must not be selected.
- Better Auth, project repositories, durable narration/render jobs, caption review snapshots, and private R2 media persistence are wired. Inngest execution and Sentry remain deferred to their planned production-hardening slices. Direct short-lived R2 URLs remain a later performance optimization; current authenticated routes preserve owner checks and private downloads.
- Instagram account connection and confirmed manual publishing are implemented in code but still require live Meta configuration verification, migrations `006` and `007`, and one explicitly approved test Reel. Recurring scheduling remains design-only.
- Stitch screens 01–18 are approved. The public homepage and authenticated workflow through finished-video review are implemented; confirmed manual Instagram publishing now follows the same design system, while scheduling remains design-only.

## 10. Exact next action

Apply migrations `006` and `007`, verify the connected Creator test account on the deployed callback, and publish one approved test Reel only after the product owner explicitly confirms the external post. Then begin one-time scheduling.

## 11. Update protocol for future developers and agents

After every implementation milestone, update this file in the same change:

1. Change the current and next phase at the top.
2. Update the status table.
3. Record implemented behavior, not intentions.
4. Record exact verification commands and results.
5. Record blockers, deferred work, and important decisions.
6. State one concrete next action.
7. Never mark a designed feature as implemented.
