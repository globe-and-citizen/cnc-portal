# Feature Documentation Guide

**Status:** Trial — applied first to Vesting

**Last updated:** 2026-08-21

**Purpose:** Define the canonical, reviewable documentation contract for CNC Portal features

## Purpose

Each product feature owns its user stories and acceptance criteria in one canonical README. The
document describes the complete user journey, the behaviour expected from the product, and the
current human-validation state.

The feature README is not an implementation manual or a delivery history. Code and tests are
executable evidence, while issues, pull requests, and Git history preserve active work and history.

## Feature Eligibility and Grouping

A documented product feature is an observable capability that a user can reach through a current
product journey. Establish the inventory from runtime evidence in this order:

1. inspect primary navigation and authentication entry points;
2. follow their linked routes and meaningful user actions;
3. apply the current access guards and role conditions;
4. group routes that serve the same user goal into one capability;
5. separate product availability from documentation and human-validation status.

A route file alone is not enough. Exclude placeholders, development playgrounds, error and
access-denied pages, unused template screens, and orphaned routes that no current journey exposes.
Also exclude technical mechanisms such as contracts, APIs, RBAC, seeding, indexers, deployment, and
server wake-up unless they are themselves exposed as an observable product goal.

When a subject also has shared runtime behaviour, split the documentation. Keep the user journey in
the feature README and place the architectural capability under `docs/implementation/` according to
the [Implementation Documentation Guide](./implementation-documentation-guide.md).

The [Product Feature Inventory](../features/README.md) is the canonical list. The client app owns
top-level capabilities. All administrator-dashboard capabilities are grouped under
`docs/features/backoffice/`, even when a dashboard capability has several routes or focused
documents.

## Documentation Ownership

| Information                                      | Canonical owner                                |
| ------------------------------------------------ | ---------------------------------------------- |
| Current user-accessible capability inventory     | `docs/features/README.md`                      |
| Product intent, journey, and acceptance criteria | `docs/features/<feature>/README.md`            |
| Backoffice capability journey                    | `docs/features/backoffice/<feature>/README.md` |
| Complex feature-specific rules                   | A focused file beside the feature README       |
| Shared architectural capability                  | `docs/implementation/<capability>/README.md`   |
| Current smart-contract behaviour                 | `docs/contracts/features/<contract>/README.md` |
| Platform-wide engineering standards              | `docs/platform/` or `.github/` guides          |
| Executable behaviour and regression proof        | Code and tests                                 |
| Active delivery and historical decisions         | GitHub issues, pull requests, ADRs, and Git    |

`docs/02_USER_STORIES.md` is a navigation index. User-story bodies must not be duplicated there.

Product and contract documentation remain separate even when they share a name. For example,
`docs/features/vesting/README.md` owns the portal journey, while
`docs/contracts/features/vesting/README.md` owns the Solidity behaviour that supports it.

## Location and Naming

- Create one directory per client capability: `docs/features/<kebab-case-feature>/`.
- Create dashboard capability documentation under `docs/features/backoffice/<kebab-case-feature>/`;
  do not add dashboard capabilities at the `docs/features/` root.
- Treat `docs/features/README.md` and `docs/features/backoffice/README.md` as navigation
  inventories, not as substitutes for the capability READMEs.
- Name the canonical entry point `README.md` with this exact casing.
- Keep the whole product journey in that README rather than splitting user stories by application
  layer.
- Add focused sibling documents only when a rule, API, or operational flow would make the README
  difficult to review.
- Link focused documents from the relevant story; do not repeat their detailed content.
- Link shared architectural behaviour to its implementation owner; do not copy components,
  invariants, or runtime failure paths into the product journey.

## Human Review Contract

Acceptance criteria are the centre of feature review. Their checkboxes record verified
implementation, while the story status and `Last reviewed` record human product validation.

- One criterion describes one observable outcome.
- Every criterion must produce a clear pass or fail result.
- `[x]` means current code, runtime behaviour, or tests confirm that the criterion is implemented.
- `[ ]` means the criterion is incomplete or has not yet been verified against current evidence.
- A story remains `🚧 In Progress` while any criterion is unchecked.
- Once every criterion is checked, the story moves to `🧪 Validation` until a reviewer completes the
  product journey.
- A story is `✅ Done` only when every criterion is checked and human validation has passed.
- Editorial changes do not change the `Last reviewed` date.
- A behaviour change resets the affected criteria to `[ ]` and moves the story to `🚧 In Progress`
  until the implementation is verified again.
- The review date changes only after the affected behaviour has been reviewed again.

### Story Statuses

| Status           | Meaning                                                    |
| ---------------- | ---------------------------------------------------------- |
| `📝 Draft`       | The target behaviour is being defined                      |
| `🚧 In Progress` | At least one criterion is incomplete or unverified         |
| `🧪 Validation`  | Every criterion is implemented; human review is incomplete |
| `✅ Done`        | Every criterion is implemented and has passed human review |
| `🔗 Reference`   | Another feature owns the detailed behaviour and validation |

Do not use `✅ Done` as a synonym for "code exists" or "automated tests pass."

## Required Structure

Every canonical feature README follows this order.

### 1. Title and Scope

Start with the feature name and `— User Stories`. Record the scope and the last behaviour review.

```markdown
# Feature Name — User Stories

**Scope:** The complete journey covered by this document

**Last reviewed:** YYYY-MM-DD

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).
```

Use `Last reviewed`, not `Last updated`: an editorial change must not imply that the product was
retested.

### 2. Product Model or Terminology

Explain only the concepts a reviewer must understand before following the journey. Include:

- the feature's core business model;
- actor and permission distinctions;
- version or legacy boundaries;
- off-chain and on-chain boundaries when they affect the user;
- terms whose product meaning differs from everyday usage.

Omit generic platform terminology. Link to its existing owner instead.

### 3. Lifecycle

Present the main journey in the order a user or tester encounters it.

- Use a short numbered list for a linear journey.
- Use Mermaid for meaningful states, branches, or cross-system interactions.
- Keep one diagram focused on one review question.
- Do not add a diagram when the same relationship is clearer as a short list.

### 4. Status Overview

Summarize the complete feature before the detailed stories.

| User Story     | Title              | Actor      | Status         | Priority | Effort |
| -------------- | ------------------ | ---------- | -------------- | :------: | ------ |
| US-FEATURE-001 | Observable outcome | Main actor | 🚧 In Progress |    P1    | M      |

Use stable IDs. Do not reuse or silently renumber an ID after it has been referenced by code, tests,
issues, or documentation.

Priorities use `P1` to `P5`. Effort uses `XS`, `S`, `M`, `L`, or `XL`; use `—` for a reference story
owned elsewhere.

### 5. User Stories

Put each part of the user-story sentence on its own source line and rendered line.

```markdown
## US-FEATURE-001: Perform an Observable Action

**As a** permitted actor\
**I want to** perform one product action\
**So that** I obtain one user-visible benefit

### How It Works

1. Describe the journey only when the criteria need this context.

### Acceptance Criteria

- [ ] One observable pass-or-fail outcome.
- [ ] One authorization, boundary, or recovery outcome.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🚧 In Progress

**Dependencies:** US-FEATURE-000 or a named current capability
```

`How It Works` is optional. Use it for a multi-step interaction, not to repeat the acceptance
criteria.

### 6. Human Validation

For reviewed stories, state when and against what the feature was reviewed. Keep this statement
short; checked criteria remain the implementation record, while this statement and `✅ Done` record
the human product review.

```markdown
## Human Validation

Validated on YYYY-MM-DD against the reviewed portal behaviour, relevant system boundaries, and
the implementation evidence below.
```

If only part of the feature was reviewed, name the stories or release boundary explicitly.

### 7. Implementation Evidence

Link to the smallest useful set of current sources:

- primary page or entry point;
- orchestration composable or service;
- business-rule utility when relevant;
- backend route or controller when relevant;
- current smart contract for on-chain behaviour;
- representative behaviour or integration tests.

Evidence links prove where behaviour comes from. They do not turn the feature README into a file
inventory.

### 8. Related Documentation and Known Gaps

Link contract behaviour, focused feature rules, API references, or another feature that owns a
referenced story.

Record a known gap only when it is verified against current behaviour. Describe the observable
impact. A GitHub issue may track remediation, but it is not evidence that the gap exists.

Omit `Known Gaps` when no gap has been verified.

## Acceptance-Criteria Quality

Cover the dimensions that materially affect the feature:

- happy path and primary result;
- roles and authorization;
- validation limits and business boundaries;
- cancellation, failure, and retry behaviour;
- loading, empty, and error states;
- state refresh or on-chain reconciliation;
- responsive and keyboard behaviour for UI whose layout changes;
- API, contract, or system outcomes that cannot be reviewed from the screen.

Tag non-UI checks with a concise marker such as `_(API)_`, `_(contract)_`, or `_(system)_`, then
state how a reviewer can observe the result.

Avoid criteria that merely name an internal component, store, library, or function. Link those
details under Implementation Evidence unless the implementation choice is itself a product
constraint.

## Progressive Disclosure

There is no line-count target. A feature README is as short as possible while still covering the
complete reviewable journey.

Move a subject into a focused sibling document when it needs extensive examples, data shapes, or
edge-case explanation. Keep a short rule and a link in the parent story. For example, Payroll owns
its full reviewable journey in `README.md`; a focused sibling is justified only when detailed rules
would otherwise obscure that journey.

Do not duplicate platform security, testing, deployment, formatting, or architecture standards.
Reference their canonical guides.

## Diagram Format

This rule applies to every committed documentation file, not only feature READMEs.

- Every diagram must be stored as Mermaid in a fenced `mermaid` block.
- ASCII art, PlantUML, Draw.io, Graphviz, and image-only diagrams are not accepted alternatives.
- Screenshots may illustrate a user interface, but they do not replace the Mermaid source for a
  flow, state model, sequence, hierarchy, or architecture diagram.
- Text code blocks may show commands, data, or directory layouts; they must not model relationships
  or flows.
- When a changed document contains a non-Mermaid diagram in the edited scope, convert it to Mermaid
  as part of the same change.

## Change Process

1. Verify that the capability and its grouping match current navigation, linked routes, and access
   guards.
2. Inspect the current feature README, product entry points, business rules, tests, and linked
   contract behaviour.
3. Define or update the lifecycle and stable story boundaries.
4. Write observable acceptance criteria, including material boundaries and recovery states.
5. Check criteria from current implementation evidence, then set `🧪 Validation` or `✅ Done` from
   the human product-review state.
6. Refresh focused evidence links and related documentation.
7. Update `docs/features/README.md`, `docs/02_USER_STORIES.md`, and `docs/README.md` only when
   navigation or canonical ownership changes.
8. Keep historical explanations in Git, issues, pull requests, or ADRs rather than the current
   feature contract.

## Review Checklist

- [ ] The README covers one complete product capability.
- [ ] The capability is reachable through a current user journey and grouped under the correct
      product surface.
- [ ] Scope, versions, actors, and system boundaries are explicit.
- [ ] The lifecycle matches the story order.
- [ ] Every story uses `As a`, `I want to`, and `So that` on separate lines.
- [ ] Every criterion is observable and independently reviewable.
- [ ] Statuses, checkboxes, and the human-validation statement agree.
- [ ] Known gaps are visible and not hidden under `✅ Done`.
- [ ] Evidence links resolve to current code or tests.
- [ ] Related feature and contract documentation is linked without duplication.
- [ ] Shared architectural behaviour is linked to `docs/implementation/` rather than duplicated.
- [ ] Every diagram is purposeful and implemented in Mermaid.
- [ ] Root indexes contain links, not copied user stories.

## Validation

Run the repository Markdown checks after editing feature documentation or this guide:

```bash
npm run lint:md
npm run format:md:check
bash scripts/audit-doc-drift.sh
git diff --check
```

The first trial of this contract is the [Vesting feature](../features/vesting/README.md).
