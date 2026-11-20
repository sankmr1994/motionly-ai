# Motionly Vercel deployment

This document is the deployment handoff for the Motionly web/control plane. Local development keeps the child-process Remotion adapter; Vercel Preview and Production use the detached Sandbox adapter implemented in Phase 3.

## Project import settings

Import `sankmr1994/motionly-ai` into Vercel with these settings:

- Production branch: keep `main` until the preview is approved
- Root Directory: `apps/web`
- Framework Preset: Next.js
- Package manager: pnpm, detected from the repository lockfile
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: leave unset so the Next.js adapter manages it
- Automatically expose Vercel System Environment Variables: enabled

Commits to `develop` should create Preview deployments. Do not promote one to Production until the Sandbox renderer, authentication, R2 playback, and health endpoints have been verified.

## Environment separation

Never paste real values into this repository. Add them in Vercel Project Settings and mark credentials as Sensitive. Use separate Better Auth secrets and MongoDB database names for Preview and Production.

| Variable                | Preview                                      | Production                 | Sensitive |
| ----------------------- | -------------------------------------------- | -------------------------- | --------- |
| `APP_ENV`               | `preview`                                    | `production`               | No        |
| `APP_URL`               | Optional; derived from the branch URL        | Final custom HTTPS origin  | No        |
| `LOG_LEVEL`             | `info`                                       | `info`                     | No        |
| `MONGODB_URI`           | Atlas URI                                    | Atlas URI                  | Yes       |
| `MONGODB_DB_NAME`       | `motionly_preview`                           | `motionly`                 | No        |
| `BETTER_AUTH_SECRET`    | Unique preview value                         | Different production value | Yes       |
| `GEMINI_API_KEY`        | Configured only when live planning is tested | Required for live planning | Yes       |
| `GEMINI_MODEL`          | Current validated model                      | Current validated model    | No        |
| `GEMINI_FALLBACK_MODEL` | Current fallback                             | Current fallback           | No        |
| `ELEVENLABS_API_KEY`    | Configured only when narration is tested     | Required for narration     | Yes       |
| `ELEVENLABS_VOICE_ID`   | Validated voice                              | Validated voice            | Yes       |
| `ELEVENLABS_MODEL_ID`   | `eleven_multilingual_v2`                     | `eleven_multilingual_v2`   | No        |
| `ELEVENLABS_VOICE_NAME` | Display name                                 | Display name               | No        |
| `R2_ACCOUNT_ID`         | Existing account                             | Existing account           | Yes       |
| `R2_ENDPOINT`           | Existing HTTPS endpoint                      | Existing HTTPS endpoint    | Yes       |
| `R2_BUCKET_NAME`        | Existing private bucket                      | Existing private bucket    | No        |
| `R2_ACCESS_KEY_ID`      | Bucket-scoped key                            | Bucket-scoped key          | Yes       |
| `R2_SECRET_ACCESS_KEY`  | Bucket-scoped secret                         | Bucket-scoped secret       | Yes       |
| `RESEND_API_KEY`        | Optional until email is tested               | Required for account email | Yes       |
| `RESEND_FROM_EMAIL`     | Verified sender                              | Verified sender            | No        |
| `MOTIONLY_ADMIN_EMAILS` | Test administrators                          | Production administrators  | Yes       |
| `VIDEO_RENDER_PROVIDER` | Optional; defaults to `vercel-sandbox`       | Optional; same default     | No        |
| `BLOB_READ_WRITE_TOKEN` | Private temporary Blob store token           | Private temporary token    | Yes       |
| `REMOTION_LICENSE_KEY`  | License value allowed by Remotion terms      | Confirmed production value | Yes       |

Keep all `META_*` values and `INTEGRATION_ENCRYPTION_KEY` unset in Preview initially. Add them to Production only after the final domain exists and Meta has the exact callback URL. Inngest and Sentry variables remain unset until those integrations are implemented.

`NODE_ENV` is managed by Next.js/Vercel and should not be added manually. `MONGODB_DNS_SERVERS` is a local resolver workaround and should remain unset on Vercel unless Atlas resolution proves it necessary.

## Deployment gates

Before the first preview:

1. Connect a **private** Vercel Blob store. It is only a temporary Sandbox-to-web handoff; completed MP4 files are copied to private R2 and the Blob is deleted.
2. `pnpm verify` must pass from the repository root.
3. `pnpm --dir apps/web build` must pass, matching the Vercel Root Directory build.
4. No `.env*`, `.vercel`, media output, or credentials may be staged in Git.

After the first preview:

1. Verify `/api/health/live` and `/api/health/ready`.
2. Verify registration, email delivery, sign-in, onboarding, and sign-out.
3. Verify authenticated R2 audio/video range playback and download.
4. Verify one 720p Sandbox render before enabling 1080p output.
5. Connect the final domain, set the exact Production `APP_URL`, and redeploy.

## Hosted render lifecycle

1. The web app validates the approved storyboard, narration, and captions and creates a durable MongoDB render job.
2. It bundles the fixed Remotion composition and owner-scoped narration assets into a temporary workspace.
3. A two-vCPU Vercel Sandbox starts a detached 720 × 1280 H.264 render with a 40-minute ceiling.
4. The existing three-second status poll reads real Sandbox progress and persists monotonic percentages in MongoDB.
5. Remotion writes the completed MP4 to a private temporary Vercel Blob.
6. Motionly copies that Blob into the existing owner/project/revision path in private Cloudflare R2, completes the durable job, deletes the Blob, and stops the Sandbox.

The Sandbox execution identifiers and output contract are persisted, so leaving and returning to the page does not start a duplicate render. Failed or expired sessions become retryable without changing the approved source work. The current 720p, concurrency-two, two-vCPU limits are intentional Hobby safeguards.

Migration `006-instagram-connection-indexes` is intentionally deferred until the final HTTPS origin and Meta configuration are ready.
