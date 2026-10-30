# Summary

Promote `release/vX.Y.Z` to `main` as the next repository release line.

This release branch contains the current development line after `vPREVIOUS`, with `<commit-count>` commits and `<changed-file-count>`
changed files. The PR is an aggregate release boundary; feature-level implementation and product evidence remain owned by their source
commits and canonical documentation.

Follow the [release procedure](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/platform/RELEASE_AUTOMATION.md). Use the
[release issue template](https://github.com/globe-and-citizen/cnc-portal/blob/develop/.github/ISSUE_TEMPLATE/release.md) for the tracking
issue and post-merge evidence.

## Tracking issue

Closes #<issue-number>

## Validation

- [ ] Relevant repository-level automated checks passed locally; list the exact checks and revision below.
- [ ] Documentation freshness was checked for every behavioural change.
- [ ] Current head/base, required CI, independent review and required release / Product/QA decisions are recorded before merge.
- [ ] Manual validation limitation is recorded below.

## Relationship validation

Follow
[Development Relationship Validation](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/development-guide/relationship-validation.md)
across the combined release. Assess every checklist type, inspect affected consumers and justify grouped non-applicable types. Reuse
relevant source-PR evidence only while the guarantees and dependencies remain unchanged; aggregation alone does not establish
non-applicability.

**Stage / inspected revision:** <pre-merge review stage, release head, and target revision>

**Scope / canonical expectations:** <baseline, included changes, canonical documentation and source delivery PRs>

**Affected consumers:** <participating features, shared capabilities, generations and operational consumers>

| Check    | Source → target    | Guarantee / applicability reason       | Relationship | Validation | Evidence                                             | Completion proposal                                                                |
| -------- | ------------------ | -------------------------------------- | ------------ | ---------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| <REL-ID> | <exact references> | <expected result or non-applicability> | <state>      | <state>    | <proof mode, method, revision, result or limitation> | <gap, owner/destination, next action, closure proof, confidence/decision, or None> |

**Required gaps / decisions:** <release-blocking relationships or decisions and proposed completions, or None>

**Separate existing gaps:** <tracked gaps that remain outside this promotion, or None>

## UI/UX Reviewer Journey

Assess the changes promoted against `main` and link relevant source-PR review evidence. Select exactly one impact level. See
`.github/copilot-instructions/ui-ux-review.md` for the contract.

- [ ] `none` — no user-facing visual or interaction impact
- [ ] `visual` — presentation or interaction feedback changed, but not the product flow
- [ ] `journey` — a user-facing action, permission boundary, state transition, route, or flow changed

### Visual review

Complete this section when `visual` is selected.

**Surface / entry point:** <route, modal, or product surface>

**Review scope:** <viewports, keyboard path, or assistive interaction to review>

**Expected result:** <what the reviewer should observe>

**Evidence:** <screenshots, recording, or repeatable manual check>

### Journey review

Complete this section when `journey` is selected. A user story stays canonical in `docs/features/`; do not copy its status or acceptance
criteria here.

**Canonical stories / use cases:** <US-... identifiers>

**Entry point:** <route or discoverable product entry>

**Prerequisites:** <test data, role, wallet, feature state, or None>

**Actors:** <one actor, or Actor A → Actor B for a permission hand-off>

**Evidence:** <automated test, recording, or repeatable manual check>

| Step | Actor   | Action            | Expected result     |
| ---- | ------- | ----------------- | ------------------- |
| 1    | <actor> | <reviewer action> | <observable result> |

## Review notes

- Source branch: `release/vX.Y.Z` → `main`.
- Comparison baseline: <previous release tag and full commit SHA>.
- Base branch current state: <main revision or release reference>.
- Merging this PR triggers automated tag/Release publication before artifact builds. Verify the run, actual tag target and expected
  artifacts on the tracking issue after merge; a rerun with an existing tag skips publication and build steps.
- Post-release `main` → `develop` synchronization: <linked follow-up issue/PR, or record the comparison evidence after merge>.
- Deployment, contract upgrades and production verification: <explicit scope, required owner/authorization and evidence, or separate
  follow-up links>. Publication alone does not establish these outcomes.
- <Additional validation limitations, follow-up issues, or reviewer attention points.>
