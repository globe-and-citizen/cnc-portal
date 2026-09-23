---
name: cnc-feature-documentation
description: Create or update evidence-backed CNC Portal product feature documentation and user stories. Use when documenting a user-accessible client or backoffice capability, validating its stories and acceptance criteria, or maintaining the product feature inventory; do not use for architecture-only documentation.
---

# CNC feature documentation

Create one reviewable product contract from the current user journey and its implementation evidence.

Before editing, read and follow the [Feature Documentation Guide](../../../docs/platform/feature-specification-guide.md). It is the
canonical owner of feature eligibility, document structure, story statuses, acceptance semantics, progressive disclosure, and diagram rules.
Do not duplicate that guide in a feature README.

## Classify the subject

- Confirm that a user can reach the capability through current navigation, linked routes, access guards, and meaningful actions. A route or
  implementation folder alone does not make a feature.
- Put client capabilities under `docs/features/<feature>/` and administrator-dashboard capabilities under
  `docs/features/backoffice/<feature>/`.
- If the subject is a shared runtime mechanism rather than a direct user outcome, use `cnc-docs-governance` and the
  [Implementation Documentation Guide](../../../docs/platform/implementation-documentation-guide.md) instead.
- When a subject has product and architectural facets, keep the user journey in the feature README and link to a separate implementation
  owner.

## Establish current evidence

1. Confirm the branch or revision whose behaviour the documentation must describe.
2. Inspect the existing feature README, feature inventories, and related focused documents.
3. Trace the journey from navigation and guards through pages and user actions to the relevant composables, services, API or contract
   behaviour, and representative tests.
4. Build a temporary evidence map for each proposed story: actor, observable goal, route or entry point, permission boundary, implementation
   source, test evidence, and known gap.
5. Classify each acceptance criterion as implemented, missing, partial, or unverified. An issue, pull request, old document, or plausible
   code path is not proof of current behaviour.
6. When the feature is under an active test-coverage review, assign each criterion the proof boundary it actually requires, then compare it
   with direct representative test references. Keep integrated E2E, mocked browser, frontend, backend, and contract evidence distinct.

Do not implement a discovered product gap unless the user also asks for that change. Report it and create a tracking issue only when
requested or required by the active GitHub workflow.

## Write or revise the feature contract

- Keep one canonical `README.md` for the complete capability and preserve stable user-story IDs.
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
- For an active coverage review, use the guide's per-story coverage summary and per-criterion target table. Derive current coverage from
  direct `AC-US-*` references, list insufficient boundaries as gaps, and never classify a story as partial solely because a criterion is
  intentionally covered by a mock or a lower test layer.
- Use the generated repository inventory to keep frontend, backend, contract, dashboard, and E2E test files visible. Distinguish direct
  US/AC markers from canonical Implementation Evidence links: the latter maps feature support but does not prove a story or criterion. Treat
  an unmapped file as an audit item, not as acceptance evidence, until its role is reviewed.
- Keep representative test titles declarative and omit `should`. Prefix a backend, unit, or focused integration title with the AC ID only
  when that test directly represents one criterion. Use the guide's structured `Covers` block for multi-criterion tests and E2E paths.
- Use Mermaid for every diagram. Add a diagram only when it makes a meaningful state, sequence, branch, hierarchy, or boundary easier to
  review.
- Link focused rules, architecture, contract behaviour, and evidence to their canonical owners instead of copying them into the journey.

## Reconcile navigation and review state

- Update `docs/features/README.md`, `docs/features/backoffice/README.md`, `docs/02_USER_STORIES.md`, or `docs/README.md` only when feature
  ownership or navigation changes.
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
