# Motionly AI — Product Requirements Document

PRD v1.3 | Updated 10 November 2026 | Originally drafted 05 November 2026

Decision status: PRD v1.2 was approved on 09 November 2026. This v1.3 amendment adds manual and recurring automatic Instagram publishing and is awaiting product-owner approval before implementation.

## 1. Executive summary

Motionly AI is a general-purpose AI-powered video creation platform that transforms user topics, ideas, and scripts into videos with coordinated visuals, narration, captions and storytelling. V1 deliberately focuses on English-language educational explainer videos using 2D motion graphics. Future releases may add news, sports, storytelling, marketing and other categories; these are not V1 commitments.

After a video is generated, Motionly supports two Instagram paths: the user can review and manually publish an approved video, or explicitly activate a recurring schedule that selects a fresh topic, generates a video and publishes it automatically after required quality and safety checks.

## 2. Business problem and opportunity

- Educational creators often need multiple tools and specialist skills for scripting, narration, animation, synchronization, and publishing.
- Generic AI video generators may not produce precise, reusable diagrams that explain concepts clearly.
- Motionly AI differentiates through structured, narration-synchronized visual storytelling, user-provided or AI-generated scripts, reusable motion graphics and explicit user approval.

## 3. Objectives and success measures

| Objective                   | Proposed measure / target                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Prove technical feasibility | G1: generate a playable 30-second 720 × 1280 MP4 with understandable animated solar-eclipse explanation and synchronized narration. |
| Simplify creation           | V1: topic-to-approved-storyboard-to-video in three user-facing steps.                                                               |
| Deliver reliable generation | G1 timing tolerance target: within 300 ms for tested animation cues; capture job success and failure reasons.                       |
| Establish repeatability     | Test solar eclipse plus at least one distinct educational topic; expand test set before beta.                                       |
| Understand unit economics   | Record per-video AI API usage, render duration, and media storage costs; decide launch thresholds later.                            |

## 4. Intended users and stakeholders

| Group                        | Primary need                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| Educational content creators | PRIMARY V1 audience: produce concise, editable concept explainers for short-form educational channels. |
| Teachers / tutors            | Secondary audience: illustrate difficult concepts with clear diagrams.                                 |
| Learners / viewers           | Understand concepts through accessible motion graphics.                                                |
| Product owner                | Approve scope, quality gates, and launch decisions.                                                    |
| Development / QA             | Implement and verify AI, video, and publishing workflows.                                              |

## 5. V1 scope and functional requirements

### 5.1 Three-step creation journey

| Step                  | Business requirement                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Plan               | User chooses (A) topic/idea for AI-generated narration script or (B) pastes a complete original explanation script. Selects 30/45/60-second duration. Both modes are supported in V1.                                                                                                                                                    |
| 2. Review             | One combined screen shows narration, storyboard, scenes, visual plan and available source references. User can edit script and scene descriptions, approve, or regenerate. In own-script mode, preserve user wording by default; changes require explicit approval. Warn when script length conflicts with duration.                     |
| 3. Generate & Publish | After approval, generate English voiceover, synchronized 2D visuals and captions; render vertical MP4. The user can preview/download, publish immediately, schedule that approved video once, or explicitly activate a recurring content schedule for automatic generation and publishing to an eligible Instagram Professional account. |

### 5.2 Supporting V1 requirements

- User signup/login and a simple dashboard / project library for V1 (not required for G1).
- My Videos view with generation status, preview, and downloadable exports.
- Asynchronous generation with visible progress, retries, failure handling, and safeguards against duplicate jobs.
- Storyboard validation against supported animation components; no execution of arbitrary AI-generated code.
- Manual publishing requires explicit approval of the completed video; connect one eligible Instagram Professional account initially.
- Recurring schedules support `REQUIRE_REVIEW` and `AUTO_PUBLISH` modes. Activating `AUTO_PUBLISH` requires explicit schedule-level confirmation showing the account, content brief, frequency and local publication time.
- Scheduled publishing includes one-time and recurring schedules, timezone-aware execution, pause/cancellation, token-expiry handling, duplicate prevention, retries, notifications and publish-status history.
- Automatic runs select a fresh topic within the user's content brief and publish only after content, factual, media-compatibility and connection-health gates pass. Any uncertain gate moves the run to review instead of publishing.
- Educational fact review safeguards, user content moderation, copyright-safe visual assets, and secure storage.
- Basic internal rate limits / quotas and cost controls, even though billing is excluded from V1.
- Show available source links and references during storyboard review, with clear provenance and warnings for unverified claims.
- Allow basic script and scene-description editing in the combined review screen; revalidate downstream narration and timing after edits.
- Private beta is the initial release model; public launch is a separate go/no-go decision.
- Retain user-generated media until user deletion, subject to documented deletion, storage and legal policies.

### 5.3 Output requirements

- English AI narration and synchronized subtitles.
- 2D motion graphics using reusable diagrams, moving objects, arrows, highlights, animated text, and scene transitions.
- Vertical 9:16 MP4; V1 presets 30, 45, and 60 seconds.
- G1 target output: 720 × 1280, 30 fps, approximately 30 seconds. Higher production resolution is a later design decision.

## 6. Out of scope for V1

- Subscription plans, payment gateway, credit wallet, and billing.
- 3D animation, AI avatars, cinematic text-to-video generation, and advanced timeline editing.
- Voice cloning, multilingual narration, team collaboration, and unbounded autonomous publishing outside a user-authorized schedule and its quality gates.
- Additional social platforms, complex social analytics, and bulk content generation.
- Vendor marketplace or unrelated generic video editing features.

## 7. Approved and proposed technology direction

| Area                    | Status / decision                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web application         | Approved for G1: Next.js App Router, TypeScript, Tailwind CSS; web interface.                                                                                                                                                  |
| Backend                 | Approved: Next.js Route Handlers. Inngest recommended for durable background orchestration and scheduling; validate during architecture.                                                                                       |
| Database                | Selected: MongoDB Atlas managed cluster; Mongoose proposed. Final collection design follows system architecture.                                                                                                               |
| Media storage           | Cloudflare R2 or Amazon S3 shortlisted; final selection at system architecture. Media retained until user deletion, subject to policy; large files stored outside MongoDB.                                                     |
| AI planning             | Approved: Google Gemini API.                                                                                                                                                                                                   |
| Narration               | Approved: ElevenLabs; timing/alignment capability to be verified.                                                                                                                                                              |
| 2D rendering            | Approved: Remotion + React/SVG. Vercel Sandbox hosted rendering is preferred but experimental/conditional on G1 feasibility, costs, resource limits and storage integration; maintain local-render fallback.                   |
| Instagram               | Approved for V1: Meta Instagram API for eligible Professional accounts, supporting manual publication, one-time scheduling and explicitly authorized recurring automatic publication; not part of the initial G1 render proof. |
| Validation / repository | Proposed: Better Auth for V1 login/session management with MongoDB Atlas; Zod for validation; pnpm workspaces and Git/GitHub.                                                                                                  |
| Environment             | Approved: Windows standard-spec development machine, VS Code + Codex, local POC.                                                                                                                                               |

## 8. Data and media requirements

- MongoDB Atlas will hold structured application data and metadata: projects, storyboards, generation jobs, and media asset references; future V1 adds users and publishing records.
- Media files (narration audio, images, final MP4) will reside in object storage for V1; cloud provider is pending comparison of cost, access controls, egress, and worker compatibility.
- G1 may use local media files during early validation, but database and storage interfaces should support future cloud migration.
- Use least-privilege credentials, server-side secrets, secure media access, retention policies, and appropriate backups.
- Approved business expectation: retain generated media until the user deletes it, subject to a documented storage and legal policy. Operational details—including backups, deletion propagation, account closure, legal exceptions, region, and privacy notices—will be specified during system architecture and policy design.

## 9. G1 proof-of-concept definition

G1 validates the central capability, not the full SaaS. The first test topic is “How a Solar Eclipse Happens?” The POC targets a 30-second, 720 × 1280, 30 fps vertical MP4, using a Windows development machine, Next.js TypeScript pnpm monorepo, Gemini, ElevenLabs and Remotion. Proposed cloud rendering with Vercel Sandbox must be benchmarked against local rendering. No implementation begins until the PRD, system architecture, database design and API design gates are approved.

| G1 acceptance gate  | Evidence required                                                                 |
| ------------------- | --------------------------------------------------------------------------------- |
| Topic to storyboard | Valid structured storyboard and user approval flow.                               |
| Voice and visuals   | English narration, meaningful Sun–Moon–Earth 2D animation, synchronized captions. |
| Video export        | Playable 720 × 1280 MP4 at 30 fps, approximately 30 seconds.                      |
| Timing              | Measured animation cue alignment; proposed tolerance ≤300 ms.                     |
| Resilience          | Job status, useful failure messages, retry behavior.                              |
| Cost / performance  | Actual API spend and local render time recorded.                                  |
| Generality          | One additional educational topic tested to expose hard-coded assumptions.         |

## 10. Delivery sequence and document gates

| Gate                     | Required approval before proceeding                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 — PRD                 | Approve the confirmed audience, source-reference requirement, simple storyboard text edits, private-beta launch, retain-until-deletion expectation, business scope and success criteria. |
| D2 — System architecture | Approve components, deployment approach, rendering jobs, security, MongoDB and media storage integration.                                                                                |
| D3 — Database design     | Approve collections, field schemas, indexes, data lifecycle and relationships.                                                                                                           |
| D4 — API design          | Approve endpoints, payloads, auth approach, async job contract and error models.                                                                                                         |
| G1 — POC implementation  | Only after D1–D4 approval: scaffold, integrate services, render and test; assess G1 acceptance criteria.                                                                                 |

No implementation is authorized by this draft. The earlier illustrative 12–16-week roadmap must be re-estimated after the design gates and G1 findings.

## 11. Risks, dependencies and assumptions

| Risk / dependency                                      | Planned mitigation                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Animation generality                                   | Strict structured instructions and a reusable Remotion component library; test multiple topics.                                                                                |
| Factual inaccuracies                                   | Reviewable storyboards, source-aware fact checks, and explicit user approval.                                                                                                  |
| Voice synchronization                                  | Test ElevenLabs timestamp support; evaluate forced alignment if needed.                                                                                                        |
| Long rendering jobs                                    | Dedicated worker, persisted job status, retries and resource limits.                                                                                                           |
| Instagram permissions, token expiry or provider limits | Begin Meta app review and account-eligibility work early; monitor connection health and account-specific limits; pause affected schedules and retain MP4 download as fallback. |
| Accidental or duplicate automatic publication          | Require explicit schedule-level opt-in, quality gates, deterministic run keys, idempotent publication jobs, provider-state checks and an immediate pause control.              |
| API and storage costs                                  | Measure per-video costs and set internal quotas before public access.                                                                                                          |
| Cloud storage choice                                   | Compare R2 versus S3 at system architecture gate; do not assume either is finalized.                                                                                           |

## 12. Confirmed PRD review decisions

- CONFIRMED — Primary V1 audience is educational content creators. Teachers and tutors are secondary audiences.
- CONFIRMED — Display available source references or links during storyboard review. Clearly identify unsupported claims and do not imply that AI-generated references have been independently verified.
- CONFIRMED — Allow simple edits to script text and scene descriptions within the combined storyboard review screen. Revalidate and regenerate affected narration/timing/animation plans after edits. No advanced timeline editor in V1.
- CONFIRMED — Initial launch is a controlled private beta; public launch requires a separate release approval after beta evaluation.
- CONFIRMED — Retain generated media until user deletion, subject to documented storage, legal, and operational policies. Define deletion behavior and exceptions in system architecture.
- PROPOSED FOR v1.3 APPROVAL — Manual Instagram publishing requires approval of the selected completed video.
- PROPOSED FOR v1.3 APPROVAL — A recurring schedule may use `REQUIRE_REVIEW` or `AUTO_PUBLISH`. Automatic publishing is authorized only for runs created by that schedule and stops when the schedule is paused, the account is disconnected or any quality gate is uncertain.

## 13. Approval record

Document owner: Motionly AI product owner

Current status: PRD v1.3 amendment awaiting explicit product-owner approval. The system, architecture, API, database and Instagram integration designs are prepared; implementation remains pending approval.

Next action after approval: begin the implementation sequence defined by the approved system, API, database and Instagram integration designs.

## 14. Platform vision and phased content strategy

- Product-level vision: Motionly AI is extensible to multiple categories and video formats. V1 is limited to educational explainer content. Future candidate categories include news, sports, storytelling and promotional videos, each potentially requiring category-specific research, rights checks, visual assets and review policies.
- Architecture intent (to validate in System Design): separate content-type planning rules from shared script, storyboard, timing, visual composition, rendering, asset and publishing services. Do not implement speculative future categories in V1.

## 15. Dual-input requirements — V1

- FR-INPUT-01: Topic-to-video. User supplies a topic or idea; Gemini proposes an educational narration script and a structured storyboard.
- FR-INPUT-02: Script-to-video. User supplies their own explanation script; the system creates scenes, narration and synchronized visuals without silently rewriting their words.
- FR-INPUT-03: In both modes, show script and storyboard together for editing and explicit approval. Regenerate affected audio, timing, captions and scene plans when edits change content.
- FR-INPUT-04: Check estimated narration duration against the selected 30/45/60-second preset. If mismatched, ask the user to shorten the script or explicitly authorize an AI-assisted rewrite; never truncate silently.
- FR-INPUT-05: Display available source references and distinguish verified sources from unverified AI claims. User remains responsible for approving factual accuracy before publishing.

## 16. Authentication, orchestration and hosted rendering

- Better Auth: preferred V1 authentication solution for signup, login, sessions and project-level authorization, integrated with MongoDB Atlas. Detailed session, account and access-control design is deferred to System Design.
- Inngest: preferred workflow orchestrator for durable video generation, retries, state changes and scheduled Instagram publishing. Exact job/event contracts and retry policies will be defined in System and API Design.
- Remotion + Vercel Sandbox: preferred hosted rendering approach, subject to G1 compatibility, performance, cost, quotas and media-upload verification. Remotion compositions must remain portable to a local or alternative worker if hosted rendering is unsuitable.
- MongoDB Atlas remains the structured data store. Cloudflare R2 and Amazon S3 remain shortlisted media object stores; select one in System Design after evaluating signed access, upload/download paths, retention, costs and rendering compatibility.

## 17. Scope boundaries and outstanding design decisions

- In scope V1: two script-input modes, educational explainers, user review/edit/approval, English narration, 2D motion graphics, captions, MP4 download, project library, authentication, Instagram publishing/scheduling and private beta.
- Out of scope V1: news/sports/marketing generators, general-purpose editing timeline, 3D/avatars, multilingual output, billing, and autonomous publishing that is not constrained by an explicitly authorized schedule and quality gates.
- Design-stage decisions: choose R2 versus S3, validate Better Auth adapter and session model, define Inngest job orchestration, assess Vercel Sandbox against local rendering, and finalize data deletion/backup policy.
- Document approval order: PRD → System Design & Architecture → Database Design → API Design → G1 POC Implementation. Each requires explicit owner sign-off; this document is not yet approved.
