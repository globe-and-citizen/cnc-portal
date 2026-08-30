# Summary

Describe the user or developer outcome, the implementation boundary, and any intentionally deferred work.

## Tracking issue

Closes #<issue-number>

## Validation

- [ ] Relevant automated checks passed locally.
- [ ] Documentation freshness was checked for every behavioural change.
- [ ] Manual validation or its explicit limitation is recorded below.

## UI/UX Reviewer Journey

Select exactly one impact level. See `.github/copilot-instructions/ui-ux-review.md` for the contract.

- [ ] `none` — no user-facing visual or interaction impact
- [ ] `visual` — presentation or interaction feedback changed, but not the product flow
- [x] `journey` — a user-facing action, permission boundary, state transition, route, or flow changed

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

List known gaps, follow-up issues, migration notes, or reviewer attention points. State `None` when no additional notes apply.
