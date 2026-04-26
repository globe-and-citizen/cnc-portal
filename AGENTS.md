# AGENTS.md

Guidance for AI coding agents (GitHub Copilot, Cursor, Codex, Claude Code, etc.) working in this repository. Human contributors should read `README.md` and `CONTRIBUTION.md`.

> Detailed area guides live in `.github/copilot-instructions/` (Vue standards, testing patterns, Web3 testing anti-patterns, review checklist, commit conventions). Consult them for specifics; this file is the orientation layer.
>
> **Working todolist**: a gitignored `todolist.md` at the repo root is the shared working list between the dev and any AI agent. Read it at the start of a session, keep it accurate as you work (mark items in_progress / done, add discoveries, remove stale items). Don't commit it. If it doesn't exist, create one with the same convention. **Respect dependencies**: tasks marked `(blocked by: …)` must not be started until their blocker is `[x]`; do not fan blocked tasks out in parallel with their blockers.

## Repository layout

Monorepo without a workspace tool — each subproject has its own `package.json` and `node_modules`. Run commands from the relevant subdirectory.

- `app/` — **active** Vue 3 SPA. TypeScript, Vite, Pinia, wagmi/viem, TanStack Query, Apollo Client, Tailwind v4, Nuxt UI v4. The main user-facing product.
- `dashboard/` — separate Nuxt app for stats/dashboards (not the SPA).
- `backend/` — Express + TypeScript REST API, Prisma ORM (PostgreSQL), JWT auth. Bruno collections in `backend/bruno/`.
- `contract/` — Hardhat + Solidity. Deployed addresses are mirrored from `contract/ignition/deployments/` into `app/src/artifacts/deployed_addresses/chain-*.json` and `dashboard/app/artifacts/deployed_addresses/`.
- `ponder/` — Ponder indexer.
- `the-graph/` — The Graph subgraph.

Frontend talks to backend over REST and to chain via wagmi/viem. Backend is a thin auth + data gateway; on-chain governance/contribution logic lives in `contract/`.

## Setup

- Node.js v22.18.0+
- PostgreSQL (or `docker-compose -f docker-compose.dev.yml up` to get one)
- Required env vars:
  - Backend: `SECRET_KEY`, `DATABASE_URL`, `FRONTEND_URL`, `CHAIN_ID`
  - Frontend: `VITE_APP_BACKEND_URL`, `VITE_APP_NETWORK_ALIAS`, `VITE_APP_ETHERSCAN_URL`
  - Contracts: `ALCHEMY_API_KEY`, `ALCHEMY_HTTP`, `PRIVATE_KEY`

After cloning: `npm install` in each subproject you'll touch (`app/`, `backend/`, `contract/`, etc.).

## Commands

### Frontend (`app/`)

- `npm run dev` — Vite dev server
- `npm run build` — `type-check` + `build-only` in parallel
- `npm run type-check` — `vue-tsc --build tsconfig.app.json --force`
- `npm run lint` — `eslint . --fix`
- `npm run format` / `format-check`
- `npm run test:unit` — Vitest. Single file: `npx vitest run path/to/file.spec.ts`. Single test: append `-t "name"`.
- `npm run test:e2e` (`:headed`, `:ui`, `:debug`) — Playwright + Synpress. `npm run test:build:cache` prebuilds the MetaMask cache.

### Backend (`backend/`)

- `npm run start` — nodemon on `src/index.ts`
- `npm run build` — `tsc` + Sentry sourcemap upload (Sentry creds required; run `tsc` directly for plain local builds)
- `npm run test` / `test:unit` / `test:e2e` — Vitest (separate configs)
- `npm run test:bruno` — runs the Bruno API collection (auto-runs auth setup)
- `npx prisma generate` — required after editing the schema
- `npm run prisma:migrate` / `npm run seed` (`:dev` / `:test` / `:staging` / `:reset`)
- `npm run lint` / `lint:fix`

### Contracts (`contract/`)

- `npm run compile`, `npm run test` (single file: `npx hardhat test test/Foo.test.ts`), `npm run coverage`
- `npm run deploy` (localhost) / `npm run deploy:polygon`
- `npm run validate-upgrade[:polygon|:local]` — OpenZeppelin upgrade safety check
- `npm run update-abi` — copies ABIs into the frontend
- `npm run lint` (solhint + eslint), `npm run format`

### Whole stack

- `docker-compose -f docker-compose.dev.yml up` — dev stack including Postgres
- `docker-compose up` — full stack

## Architecture notes

**Frontend mutation pattern.** Mutations are a pure async function plus a `useXxxMutation` composable wrapping `@tanstack/vue-query`. Use `onSuccess` / `onError` callbacks rather than awaiting + try/catch in components. Surface errors reactively via `UAlert`. Issue #1776 documents the canonical pattern.

**Single source of truth.** Prefer deriving values (computed / selectors) over denormalizing or duplicating state. Don't mirror server data into Pinia stores when a query already owns it — even if the refactor is non-trivial.

**Chain config.** Deployed contract addresses are per-chain JSON files committed under `app/src/artifacts/deployed_addresses/`. After local deploys, `app/package.json` exposes `git:ignore-locally` to keep local-only `chain-31337.json` edits out of commits.

**Auth.** Backend issues JWTs; frontend stores via Pinia.

**Web3 stack.** wagmi + viem for chain reads/writes, Apollo Client for subgraph queries, Safe SDK (`@safe-global/*`) for multisig flows.

**Frontend authoring — keep components small and readable (DX-first).** A component should fit on a screen and read like a description of the UI, not like a script. Whenever you edit a Vue file, take it as an opportunity to make it leaner.

- **Extract logic, not just markup.** Push pure data shaping into `app/src/utils/` (utility functions) and stateful/reactive logic into `app/src/composables/` (`useXxx`). The component is left declaring *what* it shows — the *how* lives outside.
- **Search before you create.** Before adding a new utility, grep `app/src/utils/` for one that already does the job (or can be generalized). Same rule for composables in `app/src/composables/` — reuse `useXxxMutation`, `useSiwe`, formatters, address/amount helpers, etc. rather than reinventing them. Prefer extending an existing helper to introducing a near-duplicate.
- **Split when a component grows.** Signs that it's time to refactor: the `<script setup>` block is longer than the `<template>`, multiple unrelated `ref`s/`watch`es, more than one `try/catch`, repeated bits of logic that could be a composable, or formatting/derivation work inline that belongs in a util.
- **One responsibility per composable / util.** Name it for what it returns (`useTeamRoster`, `formatTokenAmount`) — if you can't name it cleanly, it's doing too much.
- **Keep the mutation pattern**: pure async fn (often a util) + `useXxxMutation` composable. Components consume them; they don't orchestrate fetch/mutate logic inline.

**Surface drift proactively.** When you open a file to do work and notice it doesn't follow the rules above (oversized component, inline try/catch around mutations, duplicated util, denormalized state, dead `useToastStore` references, etc.), **don't silently ignore it and don't unilaterally rewrite the whole file either**. Tell the developer:

1. What you noticed (be specific — file + the rule it violates).
2. Why fixing it now is worth it (concrete DX/reviewability/maintenance benefit, not generic platitudes).
3. That these are exactly the items reviewers check during PR review per `.github/copilot-instructions/review-checklist.md` — fixing in the same PR avoids a follow-up round.

Then ask whether to do it now (scoped to this PR), defer (open a tracking issue), or skip. Default to *proposing*, not *imposing* — but always raise it.

## Conventions

- **Conventional Commits with gitmoji**: `<type><emoji>: <subject>` — `feat: ✨ ...`, `fix: 🐛 ...`, `refactor: ♻️ ...`, `docs: 📝 ...`, `test: ✅ ...`, `chore: 🔧 ...`, `perf: ⚡️ ...`, `build: 📦 ...`, `ci: 👷 ...`, `style: 💄 ...`. Same format for issue and PR titles. See `.github/copilot-instructions/commit-conventions.md`.
- **Atomic commits** — commit each logical change as it lands. Don't squash an entire PR into one commit at the end.
- Issues, PRs, commit messages, and user-facing UI strings/toasts are **English**.
- Vue components: `<script setup lang="ts">` Composition API. Pinia for global state, TanStack Query for server state.
- TypeScript strict mode across frontend and backend.

## Code quality gate (mandatory before pushing)

Every subproject ships its own quality checks and CI runs them. **Before pushing to GitHub, run the full check set in every subproject you touched and make sure all of them pass with zero errors.** Do not push with a failing or skipped check — fix the root cause.

Per-subproject checklist:

### `app/`

```bash
cd app
npm run lint
npm run format-check
npm run type-check
npm run test:unit -- --run
```

### `backend/`

```bash
cd backend
npm run lint
npm run format:check
npx prisma generate   # if you touched prisma/schema.prisma
npm run test:unit -- --run
```

### `contract/`

```bash
cd contract
npm run lint           # solhint + eslint
npm run format-check   # sol + ts
npm run compile
npm run test
```

### `dashboard/`, `ponder/`, `the-graph/`

Run whatever lint / type-check / test scripts the subproject's `package.json` exposes. If a script exists, it must pass.

### Docs (if you touched any `.md` agent-instruction file)

```bash
bash scripts/audit-doc-drift.sh
```

Greps for known-stale terms, broken intra-doc links, and missing canonical reference files. Runs in CI on every PR that touches agent docs.

## Before opening a PR

1. The code quality gate above passed in every touched subproject.
2. Reviewed against `.github/copilot-instructions/review-checklist.md`.
3. PR title follows Conventional Commits + gitmoji. Use the template in `.github/pull_request_template.md`.
