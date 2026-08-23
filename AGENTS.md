# AGENTS.md

Operational guidance for AI coding agents working in this repository. Human contributors should start with [README.md](./README.md) and
[CONTRIBUTION.md](./CONTRIBUTION.md).

## Start here

1. Read the gitignored root `todolist.md`. Keep it accurate while working; use `(in_progress)` for active work and `[x]` only when it is
   complete. Do not commit it. Do not start work marked `(blocked by: …)` until its blocker is complete.
2. Work in the subproject you touch. This monorepo has no workspace tool: each subproject owns its `package.json` and dependencies.
3. Read the specialised guide for the affected area. Do not treat this file as a replacement for the implementation guides.

## Repository skills

Task-specific workflows are versioned under `.agents/skills/`. Use only the one that matches the work:

- `cnc-work-orchestrator` — plan dependencies and bounded multi-agent work.
- `cnc-github-flow` — issues, Sprint hierarchy, PRs, reviews, and publishing.
- `cnc-pr-review` — issue conformance and code-quality review.
- `cnc-docs-governance` — agent and implementation documentation.
- `cnc-feature-documentation` — implementation-backed product feature stories and acceptance.
- `cnc-frontend-change` — Vue client and Nuxt dashboard changes.
- `cnc-contract-change` — Solidity and ABI changes.

`AGENTS.md` remains the universal contract. Skills contain procedures; detailed standards remain in their specialised guides.

## Repository map

- `app/` — Vue 3 SPA, the main product.
- `dashboard/` — separate Nuxt statistics dashboard.
- `backend/` — Express API and Prisma.
- `contract/` — Hardhat and Solidity contracts.
- `ponder/` and `the-graph/` — indexers.

The frontend uses REST for backend data and wagmi/viem for chain interactions. Contract deployment addresses are mirrored into the frontend
artifacts; after changing a contract interface, run `npm run generate-abi` in `contract/` and commit the generated frontend ABI.

## Implementation rules

- Keep a change scoped to the requested outcome. Report adjacent drift that materially affects correctness, security, or the edited
  behaviour; track it separately unless it blocks the current work.
- Treat documentation as part of every behavioural change. Before editing a product, contract, or shared-runtime source, identify and update
  every canonical owner required by the [Documentation Freshness Policy](./docs/platform/documentation-freshness-policy.md). The CI gate
  rejects changed behavioural sources that have no owner or whose owner was not updated in the same pull request.
- Write every documentation diagram in Mermaid. Follow the
  [diagram format rule](./docs/platform/feature-specification-guide.md#diagram-format); do not add ASCII, PlantUML, Draw.io, or image-only
  diagrams.
- Use the [query guide](./app/src/queries/README.md) for frontend API queries and mutations. In particular, mutations are pure async
  functions wrapped by a `useXxxMutation` composable, and one hook serves one endpoint rather than each UI action.
- Use the [Vue component standards](./.github/copilot-instructions/vue-component-standards.md) when editing Vue components: components
  describe UI, utilities own pure shaping, composables own reactive logic, and server state remains in its query cache.
- All feature on-chain writes use `useContractWritesV3`. Read the [contract-write guide](./app/src/composables/contracts/README.md) before
  adding or changing a write.
- Read the [testing overview](./.github/copilot-instructions/testing-overview.md) before adding frontend tests; its global mocks must be
  reused, not re-declared in individual specs.
- All display formatting goes through the canonical modules documented in
  [formatting standards](./.github/copilot-instructions/formatting-standards.md).

## Workflow and public hygiene

- Use Conventional Commits with the matching gitmoji. Keep commits atomic. GitHub artifacts and user-facing UI strings are in English; see
  [commit conventions](./.github/copilot-instructions/commit-conventions.md).
- Before opening a PR, search for a suitable issue or create one, assign it to the current authenticated GitHub user unless the task names
  another owner, and use `Closes #N` or `Fixes #N` in the PR body.
- Create every GitHub issue and PR from its repository template. After publishing, read it back with `gh issue view` or `gh pr view` and
  confirm its headings, Markdown spacing, links, and closing keyword rendered as intended before treating the artifact as complete.
- For multiline GitHub Markdown, write a body file and pass it with `gh issue|pr ... --body-file`. Never pass escaped `\n` in a shell
  `--body` string. Verify the raw body contains real line breaks before considering the rendered artifact valid.
- Treat all repository text as public. Never include infrastructure identifiers or connection strings in commits, issues, PRs, reviews, or
  committed documentation. Refer to a managed provider or a placeholder instead.

## Required validation before pushing

Run every applicable check in each subproject you changed, and fix failures before pushing.

Before every GitHub push, agents must also run `npm run lint:docs-freshness` from the repository root. The Husky pre-push hook repeats this
validation and blocks a push when a behavioural change has no current canonical documentation owner or its owner was not reviewed in the
same change. Do not bypass the hook with `--no-verify`; update the affected documentation and rerun the validator instead.

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
npx prisma generate # when prisma/schema.prisma changed
npm run test:unit -- --run
```

### `contract/`

```bash
cd contract
npm run lint
npm run format-check
npm run compile
npm run test
```

For `dashboard/`, `ponder/`, and `the-graph/`, run every relevant lint, format, type-check, build, and test script exposed by that
subproject. Contract PRs also require the [Solidity audit checklist](./.github/copilot-instructions/solidity-audit-checklist.md). When
changing agent-instruction Markdown, run:

```bash
npm run lint:md
# Markdown style lives in .prettier-markdown.json. Checks all tracked Markdown files; subproject format checks exclude Markdown.
npm run format:md:check
npm run test:docs-freshness
npm run lint:docs-freshness
bash scripts/audit-doc-drift.sh
```
