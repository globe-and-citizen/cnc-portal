# Feature Documentation Guide

**Status:** Current — applied to every canonical product feature user story

**Last updated:** 2026-08-23

**Purpose:** Define the canonical, reviewable documentation contract for CNC Portal features

## Purpose

Each product feature owns its user stories and acceptance criteria in one canonical README. The document describes the complete user
journey, the behaviour expected from the product, and the current human-validation state.

The feature README is not an implementation manual or a delivery history. Code and tests are executable evidence, while issues, pull
requests, and Git history preserve active work and history.

## Feature Eligibility and Grouping

A documented product feature is an observable capability that a user can reach through a current product journey. Establish the inventory
from runtime evidence in this order:

1. inspect primary navigation and authentication entry points;
2. follow their linked routes and meaningful user actions;
3. apply the current access guards and role conditions;
4. group routes that serve the same user goal into one capability;
5. separate product availability from documentation and human-validation status.

A route file alone is not enough. Exclude placeholders, development playgrounds, error and access-denied pages, unused template screens, and
orphaned routes that no current journey exposes. Also exclude technical mechanisms such as contracts, APIs, RBAC, seeding, indexers,
deployment, and server wake-up unless they are themselves exposed as an observable product goal.

When a subject also has shared runtime behaviour, split the documentation. Keep the user journey in the feature README and place the
architectural capability under `docs/implementation/` according to the
[Implementation Documentation Guide](./implementation-documentation-guide.md).

The [Product Feature Inventory](../features/README.md) is the canonical list. The client app owns top-level capabilities. All
administrator-dashboard capabilities are grouped under `docs/features/backoffice/`, even when a dashboard capability has several routes or
focused documents.

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
| Architectural decisions and trade-offs           | [`docs/adr/`](../adr/README.md)                |
| Active delivery and history                      | GitHub issues, pull requests, and Git          |

`docs/02_USER_STORIES.md` is a navigation index. User-story bodies must not be duplicated there.

Product and contract documentation remain separate even when they share a name. For example, `docs/features/vesting/README.md` owns the
portal journey, while `docs/contracts/features/vesting/README.md` owns the Solidity behaviour that supports it.

## Location and Naming

- Create one directory per client capability: `docs/features/<kebab-case-feature>/`.
- Create dashboard capability documentation under `docs/features/backoffice/<kebab-case-feature>/`; do not add dashboard capabilities at the
  `docs/features/` root.
- Treat `docs/features/README.md` and `docs/features/backoffice/README.md` as navigation inventories, not as substitutes for the capability
  READMEs.
- Name the canonical entry point `README.md` with this exact casing.
- Keep the whole product journey in that README rather than splitting user stories by application layer.
- Add focused sibling documents only when a rule, API, or operational flow would make the README difficult to review.
- Link focused documents from the relevant story; do not repeat their detailed content.
- Link shared architectural behaviour to its implementation owner; do not copy components, invariants, or runtime failure paths into the
  product journey.

## Human Review Contract

Acceptance criteria are the centre of feature review. Their checkboxes record verified implementation, while the story status and
`Last reviewed` record human product validation.

- Organize every story's criteria under `Happy Path`, `Business Rules`, and `Edge & Error Cases` so normal outcomes, invariant rules, and
  exceptional behaviour can be reviewed separately.
- One criterion describes one cohesive observable functional outcome: what the actor can accomplish or what domain or system result follows.
- One criterion may instead describe one independently verifiable business rule.
- Keep every criterion atomic and cohesive, testable, concise, unambiguous, and focused on the required outcome rather than its
  implementation.
- Every criterion must produce a clear pass or fail result.
- A criterion must remain true when the interface is visually redesigned without changing product behaviour.
- UI and UX choices do not belong in feature acceptance criteria. Keep component types, layout, styling, exact copy, animations,
  breakpoints, and interaction presentation in their dedicated design, accessibility, or quality scope.
- `[x]` means current code, runtime behaviour, or tests confirm that the criterion is implemented.
- `[ ]` means the criterion is incomplete or has not yet been verified against current evidence.
- A story remains `🚧 In Progress` while any criterion is unchecked.
- Once every criterion is checked, the story moves to `🧪 Validation` until a reviewer completes the product journey.
- A story is `✅ Done` only when every criterion is checked and human validation has passed.
- Editorial changes do not change the `Last reviewed` date.
- A behaviour change resets the affected criteria to `[ ]` and moves the story to `🚧 In Progress` until the implementation is verified
  again.
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

Use `Last reviewed`, not `Last updated`: an editorial change must not imply that the product was retested.

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

Use stable IDs. Do not reuse or silently renumber an ID after it has been referenced by code, tests, issues, or documentation.

Priorities use `P1` to `P5`. Effort uses `XS`, `S`, `M`, `L`, or `XL`; use `—` for a reference story owned elsewhere.

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

#### Happy Path

- [ ] One observable successful outcome.

#### Business Rules

- [ ] One independently verifiable authorization, limit, or domain rule.

#### Edge & Error Cases

- [ ] One observable boundary, invalid-input, unavailable-state, failure, or recovery outcome.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🚧 In Progress

**Dependencies:** US-FEATURE-000 or a named current capability
```

`How It Works` is optional. Use it for a multi-step interaction, not to repeat the acceptance criteria.

### 6. Human Validation

For reviewed stories, state when and against what the feature was reviewed. Keep this statement short; checked criteria remain the
implementation record, while this statement and `✅ Done` record the human product review.

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

Evidence links prove where behaviour comes from. They do not turn the feature README into a file inventory.

### 8. Related Documentation and Known Gaps

Link contract behaviour, focused feature rules, API references, or another feature that owns a referenced story.

Record a known gap only when it is verified against current behaviour. Describe the observable impact. A GitHub issue may track remediation,
but it is not evidence that the gap exists.

Omit `Known Gaps` when no gap has been verified.

## Acceptance-Criteria Quality

Acceptance criteria define the functional contract of the feature, not its UI or UX specification. Cover the functional dimensions that
materially affect the story:

- primary business action and resulting state;
- roles and authorization;
- validation limits and business boundaries;
- lifecycle transitions and persisted outcomes;
- cancellation, failure, retry, and idempotency guarantees;
- state refresh or on-chain reconciliation outcomes;
- API, contract, or system results.

For every user story, organize the criteria into these categories:

1. `Happy Path` — expected behaviour when the feature is used normally and succeeds.
2. `Business Rules` — functional constraints, permissions, limits, and domain rules that must always hold.
3. `Edge & Error Cases` — boundaries, invalid inputs, unavailable states, failures, and other exceptional scenarios.

The core rule is: **one acceptance criterion equals one cohesive observable behaviour or one independently verifiable business rule.** Each
criterion must be:

- **Atomic and cohesive:** express one pass-or-fail decision; do not combine independent rules, but do not create a separate checkbox for
  every attribute of the same result.
- **Testable:** a developer or QA reviewer can determine whether it passes or fails.
- **Concise:** prefer one clear sentence.
- **Unambiguous:** state the expected behaviour explicitly.
- **Outcome-focused:** describe what the system must do, not how it is implemented.

For example, do not combine every duration constraint into one criterion:

```markdown
- [ ] Duration must be positive, use 10-minute increments, not exceed 24 hours, and respect the daily allowance.
```

Write each independently verifiable rule separately:

```markdown
- [ ] Duration must be greater than 0.
- [ ] Duration must use 10-minute increments.
- [ ] Duration cannot exceed 24 hours.
- [ ] Duration cannot exceed the daily allowance.
```

Group attributes when they form one functional result, such as one response contract, transaction payload, signature domain, state
transition, or invariant. They must be reviewed together, supported by the same evidence, and share the same implementation status. For
example, avoid turning each field of the same history record into a separate criterion:

```markdown
- [ ] Payroll history exposes the claim status.
- [ ] Payroll history exposes the total duration.
- [ ] Payroll history exposes the token amounts.
```

Prefer one cohesive result:

```markdown
- [ ] Payroll history exposes each claim's status, total duration, and token amounts.
```

Keep criteria separate when one part can meaningfully pass while another fails, the parts need different evidence, or their implementation
checkboxes differ. A useful test is: **if one part fails, can the other parts still be accepted as implemented?** If yes, split them; if no,
group them.

Do not use Given/When/Then unless a scenario is too complex or ambiguous to express as a clear single-line criterion. Keep important edge
cases inside the owning user story instead of creating separate stories solely for error scenarios.

A screen may be the observation surface, but the criterion must state the function rather than its presentation. For example:

- Functional: "An invalid claim is rejected without changing the weekly claim."
- UI/UX-specific: "The submit button is disabled and a red error toast is displayed."

The second statement may belong in a design or interaction test, but it is not a feature acceptance criterion. The functional rule should
survive changes to components, layout, wording, styling, or responsive presentation.

Tag system-side checks with a concise marker such as `_(API)_`, `_(contract)_`, or `_(system)_`, then state how a reviewer can observe the
functional result.

Avoid criteria that merely name an internal component, store, library, or function. Link those details under Implementation Evidence unless
the implementation choice is itself a product constraint.

## Progressive Disclosure

There is no line-count target. A feature README is as short as possible while still covering the complete reviewable journey.

Move a subject into a focused sibling document when it needs extensive examples, data shapes, or edge-case explanation. Keep a short rule
and a link in the parent story. For example, Payroll owns its full reviewable journey in `README.md`; a focused sibling is justified only
when detailed rules would otherwise obscure that journey.

Do not duplicate platform security, testing, deployment, formatting, or architecture standards. Reference their canonical guides.

## Diagram Format

This rule applies to every committed documentation file, not only feature READMEs.

- Every diagram must be stored as Mermaid in a fenced `mermaid` block.
- ASCII art, PlantUML, Draw.io, Graphviz, and image-only diagrams are not accepted alternatives.
- Screenshots may illustrate a user interface, but they do not replace the Mermaid source for a flow, state model, sequence, hierarchy, or
  architecture diagram.
- Text code blocks may show commands, data, or directory layouts; they must not model relationships or flows.
- When a changed document contains a non-Mermaid diagram in the edited scope, convert it to Mermaid as part of the same change.

## Change Process

1. Verify that the capability and its grouping match current navigation, linked routes, and access guards.
2. Inspect the current feature README, product entry points, business rules, tests, and linked contract behaviour.
3. Define or update the lifecycle and stable story boundaries.
4. Write atomic and cohesive functional acceptance criteria under `Happy Path`, `Business Rules`, and `Edge & Error Cases`, including
   material boundaries and recovery outcomes without prescribing UI or UX choices.
5. Check criteria from current implementation evidence, then set `🧪 Validation` or `✅ Done` from the human product-review state.
6. Refresh focused evidence links and related documentation.
7. Update `docs/features/README.md`, `docs/02_USER_STORIES.md`, and `docs/README.md` only when navigation or canonical ownership changes.
8. Keep historical explanations in Git, issues, pull requests, or ADRs rather than the current feature contract.
9. Follow the [Documentation Freshness Policy](./documentation-freshness-policy.md): every changed behavioural source must be linked by, and
   reviewed through, its canonical feature owner in the same pull request.

## Review Checklist

- [ ] The README covers one complete product capability.
- [ ] The capability is reachable through a current user journey and grouped under the correct product surface.
- [ ] Scope, versions, actors, and system boundaries are explicit.
- [ ] The lifecycle matches the story order.
- [ ] Every story uses `As a`, `I want to`, and `So that` on separate lines.
- [ ] Every story organizes its criteria under `Happy Path`, `Business Rules`, and `Edge & Error Cases`.
- [ ] Every criterion contains one cohesive observable behaviour or one independently verifiable business rule.
- [ ] Grouped attributes form one result, use the same evidence, and share the same implementation status.
- [ ] Every criterion is a functional, observable, independently reviewable outcome that remains valid after a visual redesign.
- [ ] UI and UX requirements are kept outside feature acceptance criteria.
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
npm run test:docs-freshness
npm run lint:docs-freshness
npm run lint:md
npm run format:md:check
bash scripts/audit-doc-drift.sh
git diff --check
```

The categorized acceptance-criteria contract is applied to every canonical product feature user story. Reference-only feature pages remain
exempt until they own user stories of their own.
