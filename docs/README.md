# Motionly AI architecture documents

Last reviewed: 2026-11-10

- [Product requirements](./Motionly_AI_PRD_v1.2_Approved.md) — V1 audience, scope, user journeys, success measures, manual Instagram publishing, and explicitly authorized recurring automatic publishing.
- [Product requirements review copy](./Motionly_AI_PRD_v1_3_Review_Copy.docx) — Word version of the V1.3 Instagram publishing amendment for product-owner approval.
- [System design](./SYSTEM_DESIGN.md) — product requirements, workflows, data model, APIs, security, reliability, and rollout plan.
- [System architecture](./SYSTEM_ARCHITECTURE.md) — component boundaries, deployment topology, monorepo layout, rendering plane, infrastructure, and operations.
- [API design](./API_DESIGN.md) — versioned HTTP contract, resource schemas, authentication, errors, idempotency, concurrency, asynchronous jobs, and SSE progress.
- [Database design](./DATABASE_DESIGN.md) — MongoDB collections, relationships, indexes, validation, transactions, retention, migrations, and repository boundaries.
- [Instagram integration design](./INSTAGRAM_INTEGRATION_DESIGN.md) — account connection, manual Reel publishing, one-time publishing, recurring generation schedules, automatic publishing, reliability, and safety controls.
- [Brand direction exploration](./BRAND_DIRECTIONS.md) — three visual directions, palettes, typography, layout, motion, accessibility, and selection criteria.

These documents describe the target SaaS architecture. The current repository is still the proven POC foundation; gaps between the current and target systems are explicitly identified in the architecture document.
