# Motionly AI

Motionly AI is a creator-first application for turning a simple idea into a narrated, captioned, animated video. The repository contains both the validated deterministic video POCs and the production SaaS foundation that will be developed in small, approved phases.

The first fixture is a 30-second vertical explainer: **How does a solar eclipse happen?** It is rendered from validated storyboard JSON and predefined React/SVG animation primitives—not arbitrary AI-generated code or a slideshow of static images.

## Current milestone

- Phase 0 production foundation is complete.
- Solar-eclipse, compound-interest, and binary-search video POCs are complete.
- The next milestone is the approved Porcelain Cobalt design system and public homepage.

Read [PROJECT_STATUS.md](./PROJECT_STATUS.md) for the authoritative implementation state and exact next action.

## Requirements

- Node.js 20.9 or later (Node 24 is installed on the current machine)
- pnpm 11
- Gemini and ElevenLabs credentials only when testing those integrations
- FFmpeg is optional at this stage; it is not currently installed on this machine

## Start locally

```bash
pnpm install
pnpm verify
pnpm dev
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
storage                  Local generated assets (ignored)
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
