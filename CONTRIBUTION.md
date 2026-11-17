# Contributing to CNC Portal

This guide owns the contribution requirements shared by human developers and AI agents. Start with [README.md](./README.md) for setup. AI
agents must also follow [AGENTS.md](./AGENTS.md) for their additional execution procedures.

## Responsibilities by contributor

| Responsibility         | Human developer                                                                                                                        | AI agent                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Implementation quality | Deliver the agreed outcome with the shared standards, documentation and validation below.                                              | Meet the same requirements.                                                                                      |
| Delivery tracking      | Keep the issue, PR, evidence and blockers accurate with the delivery owner.                                                            | Also perform the issue, hierarchy and Project lifecycle operations and verify their readback.                    |
| Working method         | Choose a working method and tools that satisfy the contribution contract.                                                              | Follow the required local planning, repository skills and tool procedures in AGENTS.                             |
| Review and acceptance  | Authors provide evidence; independent reviewers assess the change. The designated human validator records required product acceptance. | Provide evidence and perform authorized reviews; keep required human acceptance pending until actually recorded. |

Local agent scratchpads, MCP usage, automated publication procedures and tool readback are not additional requirements for a human
developer. Shared code quality, security, documentation and acceptance requirements apply regardless of who writes the change or whether a
human uses AI assistance.

Issue authors should describe the need, intended outcome and known boundaries first. AI agents record the relationship plan in the issue
before implementation. Developers working without an agent may skip that issue section, while still performing the shared relationship
assessment and recording results and evidence in the PR. Agent instructions do not transfer human product decisions or acceptance.

## Shared contribution contract

### Scope and documentation

- Keep the change scoped to the agreed outcome. Report adjacent correctness, security or behaviour gaps separately unless they block it.
- Treat documentation as part of a behavioural change. Before editing a product, contract or shared-runtime source, identify every canonical
  owner under the [Documentation Freshness Policy](./docs/platform/documentation-freshness-policy.md) and update it in the same PR. CI
  rejects a behavioural change with missing or stale ownership evidence.
- Use Mermaid for documentation diagrams under the [diagram format rule](./docs/platform/feature-specification-guide.md#diagram-format).
- Apply [Development Relationship Validation](./docs/development-guide/relationship-validation.md) at issue scoping, implementation and
  review readiness, independent review, and final validation before merge. Inspect affected consumers even when their files are unchanged;
  record applicability, evidence and completion proposals in the PR. Agents also record the plan in the issue before implementation.

### Implementation standards

Work in the subproject you touch. This monorepo has no workspace tool; each subproject owns its `package.json` and dependencies. Read the
applicable specialised guides before implementation:

- [Development standards index](./.github/copilot-instructions/README.md): shared security, accessibility, coding and review guidance.
- [API query guide](./app/src/queries/README.md) and [TanStack Query error handling](./docs/platform/QUERY_STANDARDS.md#error-handling):
  pure async mutations wrapped by one endpoint-level composable, with lifecycle-owned error handling, state transitions and retry policy.
- [Vue component standards](./.github/copilot-instructions/vue-component-standards.md): components describe UI, utilities own pure shaping,
  composables own reactive logic, and server state stays in its query cache.
- [Contract-write guide](./app/src/composables/contracts/README.md): all feature on-chain writes use `useContractWritesV3`.
- [Testing overview](./.github/copilot-instructions/testing-overview.md): reuse the global frontend mocks rather than re-declaring them in
  individual specs.
- [Formatting standards](./.github/copilot-instructions/formatting-standards.md): use canonical display-formatting modules.
- [Solidity audit checklist](./.github/copilot-instructions/solidity-audit-checklist.md): required for contract PRs. After a contract
  interface change, run `npm run generate-abi` in `contract/` and commit the generated frontend ABI.

### GitHub and review

- Use `feature/<slug>` branches for ordinary work. Follow the [release procedure](./docs/platform/RELEASE_AUTOMATION.md) for release
  branches.
- Use [Conventional Commits with the matching gitmoji](./.github/copilot-instructions/commit-conventions.md) for atomic commits, ordinary PR
  titles and ordinary issue titles. Sprint, Goal, Sprint Category and release issue titles and release promotion PR titles follow the
  dedicated conventions. Do not squash a whole PR into a single final commit. Do not add co-author trailers or generated attribution blocks.
- Write GitHub artifacts and user-facing UI strings in English.
- Every PR links a tracking issue using `Closes #N` or `Fixes #N`. Find a suitable existing issue or create one from the repository template
  before opening the PR; assign the delivery owner.
- Every work issue has a native GitHub parent, except explicit Sprint or backlog roots. Planned work follows Sprint → Goal → optional
  coordinator → delivery. Work directly needed for a specific Goal stays under that Goal. Other Sprint work belongs under the appropriate
  transverse Sprint category. A native issue has one parent: link Goal-owned work from a category when useful without moving it. Preserve
  agreed scope and keep routine delivery evidence on the issue or PR that owns it.
- Use the repository issue and PR templates. Keep the current scope, validation evidence, limitations and blockers clear. Follow the
  [Kanban field contract](./docs/development-guide/kanban-project.md) for tracked field meanings; AGENTS defines the additional obligation
  for agents to perform and verify those lifecycle operations.
- Review findings belong inline on the relevant lines, with the overall assessment in the review body. Explain the problem, its impact and
  the principle to apply. A PR merge or passing CI does not establish required human product acceptance; follow the
  [human review contract](./docs/platform/feature-specification-guide.md#human-review-contract).
- Treat repository text as public. Never include infrastructure identifiers or connection strings in commits, issues, PRs, reviews or
  committed documentation. Use abstract placeholders and refer to a managed provider generically.

### Sprint categories

Use the [Sprint Category template](./.github/ISSUE_TEMPLATE/sprint_category.md) to coordinate work across participating repositories. A
category is a coordination bucket, not a substitute for a specific outcome Goal. Each task retains its repository, owner, acceptance
criteria, relationship assessment, and evidence. Choose the category by the work performed:

- **Bugs and performance:** correct a malfunction or improve performance. For example, fix a reported incorrect transfer or reduce page load
  time. A bug reported by a user remains a bug.
- **User requests:** add or improve requested behavior. For example, add a requested worksheet sharing action.
- **Technical debt:** improve structure or maintainability without an intended user-facing behavior change. For example, update dependencies
  while preserving existing behavior.

Attach categories to the Sprint plan and keep tasks directly required by a specific Goal under that Goal. Link those tasks from a category
for classification when useful; do not move them merely to produce a category count. Cross-repository native links depend on actual GitHub
permissions and support; verify them and retain explicit issue links where unavailable.

## Feature documentation with coding agents

The repository contains the complete [`w3-feature-documentation` skill](./.agents/skills/w3-feature-documentation/SKILL.md), including its
[reference guide](./.agents/skills/w3-feature-documentation/references/feature-guide.md). Use it as the primary workflow for product feature
documentation, together with the [CNC-specific supplement](./.agents/skills/cnc-feature-documentation/SKILL.md) and the repository's feature
review contract. The copy is a versioned snapshot of the [W3 Frame skills repository](https://github.com/W3-Frame/agent-skills); update the
complete bundle together after reviewing upstream changes.

- **Codex:** the repository skill is in `.agents/skills/w3-feature-documentation/`.
- **Claude Code:** `.claude/skills/w3-feature-documentation/` provides a discovery entry that loads the shared repository skill and guide.
- **DeepSeek Harness:** its filesystem skill provider can discover the shared `.agents/skills/` directory when the skill registry and
  filesystem provider are enabled. Consult the
  [provider setup](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/skill/skill-filesystem) for the installed version.
- **Another agent:** follow that agent's skill-installation instructions and select or copy the complete
  `.agents/skills/w3-feature-documentation/` directory, including `references/`, to its supported project skill location. If it cannot load
  skills, ask it to read the repository skill and its linked guide directly. Also provide the CNC-specific supplement and repository
  contribution instructions. Verify that the agent can open the guide before relying on it.

The skill directs the agent to inspect the repository's established conventions and decisions; installation does not authorize product
changes, publishing, or human acceptance.

## Human developer workflow

1. Set up the repository from README and agree the intended outcome, tracking issue, parent and validation requirements with the delivery
   owner. Fork and clone when contributing from outside the repository.
2. Create a working branch and read the shared standards relevant to the affected area.
3. Implement the outcome with the necessary tests and canonical documentation. Keep the issue and blockers accurate.
4. Run the applicable validation below. Record actual results and any unavailable required proof; a draft can expose pending work.
5. Commit logical changes separately, push the working branch and open a PR from the template with its tracking issue and evidence.
6. Address independent review and obtain required human validation. Merge only when authorized and required checks pass; then synchronize
   the checkout or fork and remove the working branch when appropriate.

## Required validation before pushing

This section owns the shared command lists. Run every applicable check in each changed subproject and fix failures before pushing. Run
builds for affected application packages and the additional browser or integration checks required by the changed guarantees. Consult the
subproject's scripts and owning testing guide; an interactive test runner is not evidence of an executed acceptance journey.

Before every push, run `npm run lint:docs-freshness` from the repository root. The Husky pre-push hook repeats this check. Do not bypass it
with `--no-verify`; update the canonical documentation and rerun validation.

### App

Run in `app/`:

```bash
npm run lint
npm run format-check
npm run type-check
npm run test:unit -- --run
npm run build
```

### Backend

Run in `backend/`:

```bash
npm run lint
npm run format:check
npx prisma generate # when prisma/schema.prisma changed
npm run test:unit -- --run
npm run build
```

### Contracts

Run in `contract/`:

```bash
npm run lint
npm run format-check
npm run compile
npm run test
```

### Other subprojects

For `dashboard/`, run every relevant lint, format, type-check, build and test script exposed by that subproject.

### Agent instructions and documentation governance

When changing agent instructions, skills or their linked guides, run these checks from the repository root regardless of the contributor:

```bash
npm run lint:md
npm run format:md:check
npm run test:acceptance-traceability
npm run lint:acceptance-traceability
npm run test:docs-freshness
npm run lint:docs-freshness
bash scripts/audit-doc-drift.sh
```

Markdown style lives in `.prettier-markdown.json`; the format check covers every tracked Markdown file. Subproject format checks exclude
Markdown. Changes to repository skills also require their skill validation under the documentation governance procedure.
