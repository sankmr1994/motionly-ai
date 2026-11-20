# Motionly AI

Motionly AI is a creator-first application for turning a simple idea into a narrated, captioned, animated video. The repository contains both the validated deterministic video POCs and the production SaaS foundation that will be developed in small, approved phases.

Videos are rendered from validated storyboard JSON and predefined React/SVG animation primitives—not arbitrary AI-generated code or a slideshow of static images.

## Current milestone

- The creator workflow from account creation through approved MP4 download is implemented.
- Narration and completed videos are persisted privately in Cloudflare R2; MongoDB stores their owner-scoped metadata.
- Solar-eclipse, compound-interest, and binary-search video POCs are complete.
- The Instagram account-connection foundation is implemented and locally verified.
- Detached Vercel Sandbox rendering is implemented for Preview/Production with real progress, temporary private Blob handoff, and permanent private R2 output; the next milestone is the first Vercel Preview deployment.

Read [PROJECT_STATUS.md](./PROJECT_STATUS.md) for the authoritative implementation state and exact next action.
See [docs/VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md) for the approved Vercel Hobby project settings and environment separation checklist.

## Requirements

- Node.js 20.9 or later (Node 24 is installed on the current machine)
- pnpm 11
- Gemini and ElevenLabs credentials only when testing those integrations
- A private Cloudflare R2 bucket and bucket-scoped S3 credentials for narration and completed-video storage
- FFmpeg is optional at this stage; it is not currently installed on this machine

## Start locally

```bash
pnpm install
pnpm verify
pnpm check:r2
pnpm check:r2:storage
pnpm dev
```

To copy legacy local application media into R2 without deleting the local rollback copies:

```bash
pnpm migrate:r2-media
```

To verify that every MongoDB media reference is grouped under its owning user and readable from R2:

```bash
pnpm check:r2:references
```

The protected `/admin/media` page maps private R2 user folders to Motionly accounts and summarizes their projects, audio, videos, and stored bytes. Grant access only to trusted verified accounts with a comma-separated `MOTIONLY_ADMIN_EMAILS` allowlist. Verify the read-only aggregation with:

```bash
pnpm check:admin-media
```

Open the URL printed by Next.js. To use Remotion Studio instead:

```bash
pnpm studio
```

Render the silent deterministic fixture:

```bash
pnpm render:solar
```

The output is written to `out/solar-eclipse.mp4` and excluded from Git.

## Credentials

Copy `.env.example` to `.env.local` for the web app or `.env` for CLI scripts, then set the values locally. Do not paste secrets into chat, commit them, or include them in logs.

Required only for live API calls:

- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## Workspace

```text
apps/web                 Next.js application and current POC review UI
packages/ai              Gemini and ElevenLabs adapters
packages/config          Typed server environment configuration
packages/db              MongoDB connection and migration foundation
packages/observability   Structured logs and request IDs
packages/shared          Zod contracts, timeline compiler, fixtures
packages/video           Remotion compositions and SVG primitives
infrastructure           Local infrastructure definitions
storage                  Temporary render workspaces and legacy local assets (ignored)
out                      Rendered videos (ignored)
```

Health endpoints:

- `GET /api/health/live` verifies the web process.
- `GET /api/health/ready` verifies required dependencies, currently MongoDB.

## Architecture

- [System design](./docs/SYSTEM_DESIGN.md)
- [System architecture](./docs/SYSTEM_ARCHITECTURE.md)
- [API design](./docs/API_DESIGN.md)
- [Database design](./docs/DATABASE_DESIGN.md)
- [Brand direction exploration](./docs/BRAND_DIRECTIONS.md)
- [Architecture document index](./docs/README.md)
