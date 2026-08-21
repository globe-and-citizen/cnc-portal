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

## Documentation Ownership

| Information                                      | Canonical owner                                |
| ------------------------------------------------ | ---------------------------------------------- |
| Product intent, journey, and acceptance criteria | `docs/features/<feature>/README.md`            |
| Complex feature-specific rules                   | A focused file beside the feature README       |
| Current smart-contract behaviour                 | `docs/features/contracts/<contract>/README.md` |
| Platform-wide engineering standards              | `docs/platform/` or `.github/` guides          |
| Executable behaviour and regression proof        | Code and tests                                 |
| Active delivery and historical decisions         | GitHub issues, pull requests, ADRs, and Git    |

`docs/02_USER_STORIES.md` is a navigation index. User-story bodies must not be duplicated there.

Product and contract documentation remain separate even when they share a name. For example,
`docs/features/vesting/README.md` owns the portal journey, while
`docs/features/contracts/vesting/README.md` owns the Solidity behaviour that supports it.

## Location and Naming

- Create one directory per product capability: `docs/features/<kebab-case-feature>/`.
- Name the canonical entry point `README.md` with this exact casing.
- Keep the whole product journey in that README rather than splitting user stories by application
  layer.
- Add focused sibling documents only when a rule, API, or operational flow would make the README
  difficult to review.
- Link focused documents from the relevant story; do not repeat their detailed content.

## Human Review Contract

Acceptance criteria are the centre of feature review. Automated tests support the decision but do
not replace the reviewer.

- One criterion describes one observable outcome.
- Every criterion must produce a clear pass or fail result.
- Checkboxes record human validation for the reviewed behaviour.
- A story is `✅ Done` only when every criterion is checked.
- Editorial changes do not change the `Last reviewed` date.
- A behaviour change resets the affected criteria to `[ ]` and moves the story to `🧪 Validation`.
- The review date changes only after the affected behaviour has been reviewed again.

### Story Statuses

| Status           | Meaning                                                    |
| ---------------- | ---------------------------------------------------------- |
| `📝 Draft`       | The target behaviour is being defined                      |
| `🚧 In Progress` | The implementation is incomplete                           |
| `🧪 Validation`  | The implementation exists, but human review is incomplete  |
| `✅ Done`        | Every acceptance criterion has passed human review         |
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

| User Story     | Title              | Actor      | Status        | Priority | Effort |
| -------------- | ------------------ | ---------- | ------------- | :------: | ------ |
| US-FEATURE-001 | Observable outcome | Main actor | 🧪 Validation |    P1    | M      |

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

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-FEATURE-000 or a named current capability
```

`How It Works` is optional. Use it for a multi-step interaction, not to repeat the acceptance
criteria.

### 6. Human Validation

For reviewed stories, state when and against what the feature was reviewed. Keep this statement
short; the checked criteria are the review record.

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
its full journey in `README.md` and can link a focused wage-scheduling document from the wage story.

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

1. Inspect the current feature README, product entry points, business rules, tests, and linked
   contract behaviour.
2. Define or update the lifecycle and stable story boundaries.
3. Write observable acceptance criteria, including material boundaries and recovery states.
4. Set status and checkboxes from actual human validation, not implementation confidence.
5. Refresh focused evidence links and related documentation.
6. Update `docs/02_USER_STORIES.md` and `docs/README.md` only when navigation changes.
7. Keep historical explanations in Git, issues, pull requests, or ADRs rather than the current
   feature contract.

## Review Checklist

- [ ] The README covers one complete product capability.
- [ ] Scope, versions, actors, and system boundaries are explicit.
- [ ] The lifecycle matches the story order.
- [ ] Every story uses `As a`, `I want to`, and `So that` on separate lines.
- [ ] Every criterion is observable and independently reviewable.
- [ ] Statuses, checkboxes, and the human-validation statement agree.
- [ ] Known gaps are visible and not hidden under `✅ Done`.
- [ ] Evidence links resolve to current code or tests.
- [ ] Related feature and contract documentation is linked without duplication.
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
