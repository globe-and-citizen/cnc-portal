---
name: cnc-feature-documentation
description: Create or update evidence-backed CNC Portal product feature documentation and user stories. Use when documenting a planned or accessible client or backoffice capability, validating its stories and acceptance criteria, or maintaining the product feature catalogue; do not use for architecture-only documentation.
---

# CNC feature documentation

Use the shared [W3 feature documentation skill](../w3-feature-documentation/SKILL.md) as the primary workflow, including its feature guide.
Apply this CNC-specific supplement for evidence, traceability and human product review. Create a reviewable product contract from the
current user journey and its implementation evidence.

Before editing, read and follow the [Feature Documentation Guide](../../../docs/platform/feature-specification-guide.md). It is the
canonical owner of feature eligibility, document structure, story statuses, acceptance semantics, progressive disclosure, and diagram rules.
Do not duplicate that guide in a feature README.

Apply [Development Relationship Validation](../../../docs/development-guide/relationship-validation.md) to the documented criteria,
implementation, cross-domain consumers, and proof claims. Record the assessment and completion proposals in the issue/PR; keep each
canonical rule with its existing owner.

## Classify the subject

- Group related capabilities into modules; a feature is an observable capability with a distinct `FEAT-*` ID and one or more `US-*` stories.
- Document proposed and planned features as well as current ones. Distinguish intended release scope from current access and assessed
  status; leave unknown scope explicit. Verify navigation, routes, guards and actions before claiming a capability is currently reachable.
- Keep client modules under `docs/features/<module>/` and dashboard modules under `docs/features/backoffice/<module>/`; preserve existing
  paths, identifiers, stories, criteria and evidence when migrating. Review ambiguous historical stories before splitting or regrouping
  them.
- Use `cnc-docs-governance` for shared runtime mechanisms, and link their implementation owner from the product journey.

## Establish current evidence

1. Confirm the branch or revision whose behaviour the documentation must describe.
2. Inspect the existing feature README, feature inventories, and related focused documents.
3. Trace the journey from navigation and guards through pages and user actions to the relevant composables, services, API or contract
   behaviour, and representative tests.
4. Build a temporary evidence map for each proposed story: actor, observable goal, route or entry point, permission boundary, implementation
   source, test evidence, and known gap.
5. Classify each acceptance criterion as implemented, missing, partial, or unverified. An issue, pull request, old document, or plausible
   code path is not proof of current behaviour.
6. When the feature is under an active test-coverage review, identify the code layers that own each criterion, assign the smallest proof set
   that covers those responsibilities and any material boundary risk, and record why that proof is necessary. Then compare it with direct
   representative test references. Keep integrated E2E, mocked browser, frontend, backend, and contract evidence distinct.

Do not implement a discovered product gap unless the user also asks for that change. Report it and create a tracking issue only when
requested or required by the active GitHub workflow.

## Write or revise the feature contract

- Keep one canonical `README.md` for the module and its related features and preserve stable user-story IDs.
- Nest each default user story below its feature heading with its own stable ID and the same title; nest criteria and coverage under the
  story. Add more stories only for distinct needs; follow the guide when a second story makes an ID migration necessary.
- List the status overview and detailed stories in ascending stable user-story-ID order. A lifecycle can show the actual journey and its
  branches without changing that documentation order.
- Give each story one actor, one action, and one user-visible benefit.
- Keep the three clauses on consecutive source and rendered lines, with no blank lines:

  ```markdown
  **As a** permitted actor\
  **I want to** perform one product action\
  **So that** I obtain one user-visible benefit
  ```

- Make each acceptance criterion an independently observable functional outcome. Cover the business result, permissions, validation
  boundaries, state transitions, persistence, cancellation, failure, retry, reconciliation, API, or contract outcomes that materially affect
  that story.
- Under every story's `Acceptance Criteria`, use the guide's `Happy Path`, `Business Rules`, and `Edge & Error Cases` categories. Keep each
  criterion atomic and cohesive: one observable result or one independently verifiable business rule. Group attributes of the same response,
  payload, signature domain, transition, or invariant when they use the same evidence and checkbox status. Split parts that can meaningfully
  pass or fail independently, require different evidence, or have different implementation states.
- Write criteria that remain true if the interface is visually redesigned without changing the product behaviour. Do not prescribe
  components, layout, styling, copy, animations, breakpoints, or other UI/UX choices in feature acceptance criteria. Track those concerns in
  their dedicated design, accessibility, or quality scope.
- A screen can be the place where a reviewer observes the result, but the criterion must describe the function rather than its presentation.
  Prefer "the invalid operation is rejected without changing the saved state" over "the submit button is disabled and shows an error toast."
- Check a criterion only when current code, tests, or observed runtime behaviour proves it. Split partial behaviour so the implemented and
  missing outcomes remain visible.
- Apply the guide's status and human-review contract exactly. Fully implemented criteria without a completed product review belong in
  `🧪 Validation`, not `✅ Done`.
- For an active coverage review, use the guide's per-story coverage summary, the shared proof-strategy registry, and compact per-criterion
  strategy table. Compose its stable `PS-*` IDs from actual owning layers and material boundaries: a backend- or contract-owned rule needs
  its focused proof even when an integrated journey exists. Derive the complete AC-level current evidence from direct `AC-US-*` references
  on every strategy row, list insufficient obligations as gaps, and never classify a story as partial solely because a criterion is
  intentionally covered by a mock or a lower test layer.
- Use the generated repository inventory to keep frontend, backend, contract, dashboard, and E2E test files visible. Distinguish direct
  US/AC markers from canonical Implementation Evidence links: the latter maps feature support but does not prove a story or criterion. Keep
  contract- or implementation-owned tests in the technical-only category. Treat an unmapped file as an audit item, not as acceptance
  evidence, until its role is reviewed.
- Review feature-only and technical-only tests for documentation discovery. If a test proves an existing outcome, link only the
  representative evidence. Add an AC only for verified stable user-visible behavior or a business rule, and add a US only for a distinct
  actor goal. Keep implementation details technical, and never document stale or accidental test behavior as product intent.
- Keep representative test titles declarative and omit `should`. When a test represents one canonical ID, put the most specific ID in the
  title instead of a comment: prefix the test title for one AC, or the enclosing suite title for one US. Reserve the guide's structured
  `Covers` block for tests and E2E paths that represent two or more IDs.
- Use Mermaid for every diagram. Add a diagram only when it makes a meaningful state, sequence, branch, hierarchy, or boundary easier to
  review.
- Link focused rules, architecture, contract behaviour, and evidence to their canonical owners instead of copying them into the journey.

## Reconcile navigation and review state

- Update `docs/features/README.md` when module membership, feature titles, intended scope or story status changes. Update the backoffice
  inventory and documentation hub when their navigation or ownership changes.
- Change `Last reviewed` only after the affected behaviour has been reviewed; editorial work alone does not refresh it.
- Preserve verified current stories while correcting stale claims. List unresolved gaps and the evidence still needed for unchecked
  criteria.
- End the task with a compact summary of story statuses, checked and unchecked criteria, evidence inspected, and any human validation still
  required.

## Validate

Inspect the exact documentation diff, then run:

```bash
npm run lint:md
npm run format:md:check
npm run test:acceptance-traceability
npm run lint:acceptance-traceability
bash scripts/audit-doc-drift.sh
git diff --check
```

When this skill itself changes, also validate every affected skill with the Skill Creator `quick_validate.py` script.
