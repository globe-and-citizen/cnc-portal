# Kanban Project Field Contract

## Ownership and board

Every issue created or reused by an agent for CNC work belongs on the
[CNC Kanban Board](https://github.com/orgs/globe-and-citizen/projects/13), including Goals, coordinators, delivery issues and participating
cross-repository issues. Keep an existing card; add one when missing. Native hierarchy and Project membership are separate relationships.
Preserve cards in other Projects.

This guide owns field meanings and lifecycle requirements. [AGENTS.md](../../AGENTS.md) requires compliance; the
[GitHub flow skill](../../.agents/skills/cnc-github-flow/SKILL.md) owns issue creation, hierarchy, publication and closure procedures.

## Field meanings

Inspect the live Project schema and available options before writing. Use the existing field types and option IDs rather than creating
replacement fields or storing Project metadata only in the issue body.

| Field            | Required meaning and value                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Size             | Required issue classification: `Epics`, `Sprint`, `Goals`, `Feature`, `Stories`, `Task` or `Bugs`. This is not an effort estimate. Use `Sprint` for a Sprint plan, `Goals` for a Sprint Goal (including Bug and perf), `Bugs` for a bug delivery, and `Task` for a bounded technical, documentation or coordination task. Use the other classifications only for their actual scope. |
| Sprint Iteration | Required for work committed to a Sprint; match its native Sprint/Goal hierarchy and agreed scope. Leave empty for unscheduled backlog work and record that disposition. Do not assign the current iteration merely because an issue was created today.                                                                                                                               |
| Status           | Required current stage: `Backlog`, `Sprint Backlog`, `Specification`, `Specification Done`, `Priority`, `Suspended`, `Implementation`, `Implementation Done`, `Validation` or `Done`, according to actual progress and the issue's own criteria.                                                                                                                                     |
| Priority         | Required triage value: `Priority` for explicitly prioritized work; otherwise `Not Priority`. Preserve an existing triage decision unless the authorized work changes it. The separate Status option `Priority` does not replace this field.                                                                                                                                          |
| Blocking         | `Internally Blocked` or `Externally Blocked` when an identified dependency prevents progress; link the blocker in the issue. Leave empty when no blocker applies and clear a resolved blocker.                                                                                                                                                                                       |
| Start date       | Actual calendar day implementation began for this issue's scope, including documentation or other non-code delivery. Leave empty until implementation starts.                                                                                                                                                                                                                        |
| End date         | Actual calendar day implementation finished for this issue's scope, before any subsequent review or acceptance. Leave empty while implementation is unfinished.                                                                                                                                                                                                                      |

Assign the issue's delivery owner and maintain its title, labels, milestone and linked PRs when applicable. Reviewers follow the PR's review
requirements. Repository, native parent, sub-issue progress and Created/Updated/Closed fields reflect their source records; verify relevant
relationships instead of fabricating values. A non-applicable milestone, reviewer, label or blocker may remain empty.

## Actual dates and evidence

- Record dates as `YYYY-MM-DD` in the agreed working timezone (Africa/Lome by default). Start date is not the creation date, assignment date
  or iteration start unless implementation really began that day. End date is not a forecast, Sprint deadline, PR publication date, merge
  date or issue closure date unless implementation really finished that day. Keep target deadlines explicitly separate in the issue.
- For ongoing work, preserve the earliest evidenced implementation start. A pause, reassignment or Sprint move does not reset it. Historical
  corrections need dated work evidence, such as an implementation log, commit or recorded owner confirmation; inspect what that evidence
  establishes instead of assuming the first commit was the first day of work.
- Set End date when the scoped implementation and its applicable local checks are complete. `Implementation Done` can still await review;
  `Validation` can still await required acceptance. An End date alone never establishes `Done`, product acceptance or issue closure.
- If implementation resumes after a recorded finish, retain its earlier milestone in the issue history, clear the current End date and set a
  new actual finish when work completes again. Keep the original Start date. Reopening solely for validation leaves the implementation dates
  intact.
- For aggregate issues, evaluate the whole scoped implementation. A single child's completion does not finish its Goal or coordinator. When
  useful, derive actual dates from evidenced in-scope work; never substitute the Sprint's scheduled boundaries or copy one child's dates
  without assessing the remaining scope.
- Cancellation or closure as not planned does not imply implementation finished. Preserve a legitimate Start date when work began; leave End
  date empty if the scoped implementation was not completed. Record the disposition separately.
- End date must not precede Start date; actual dates cannot be in the future. If a historical date cannot be established, leave it unknown
  and record the precise evidence gap and next action on the issue. Do not invent a date to make a card look complete or silently overwrite
  a manual value.

## Lifecycle requirements

| Event                        | Required reconciliation                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create or reuse an issue     | Verify board membership, native parent, assignee, Size, Status, Priority, Sprint Iteration and Blocking. Dates are empty unless the corresponding implementation event has already occurred.                                      |
| Commit work to a Sprint      | Set Sprint Iteration from the agreed Sprint and reconcile hierarchy and Status. Unstarted planned work normally uses Sprint Backlog or its actual specification stage.                                                            |
| Begin implementation         | Set Start date to the actual first day and normally move Status to Implementation. If a priority or suspension column is deliberately retained, record that context; the actual date is still required.                           |
| Pause, block or reprioritize | Update Status, Priority and Blocking as applicable; retain actual dates and explain the dependency or decision.                                                                                                                   |
| Finish implementation        | Set End date and use Implementation Done or Validation according to the next required step. Keep missing reviews and acceptance visible.                                                                                          |
| Validate or close            | Reconcile Status with the issue's own exit criteria. Use Done when required completion and acceptance are satisfied; preserve actual implementation dates. Record cancellation explicitly rather than presenting it as delivered. |
| Move scope or reopen         | Reconcile hierarchy, Sprint Iteration, classification, status and blockers. Apply the date rules above; preserve evidence of prior milestones.                                                                                    |

## Update and readback procedure

Use `gh` for Project operations. Resolve the Project, field, option, iteration and item IDs from current data; do not commit opaque IDs as
permanent configuration. For example:

```bash
gh project view 13 --owner globe-and-citizen --format json
gh project field-list 13 --owner globe-and-citizen --format json
gh project item-add 13 --owner globe-and-citizen --url <issue-url> --format json
```

Read iteration configuration, including completed iterations when resolving historical work, through `gh api graphql`. Edit only the target
card's applicable fields with `gh project item-edit` or the equivalent GraphQL mutation. Use each field's real type: single-select,
iteration or date. Recheck live values before replacing an existing manual decision.

After creation and each lifecycle update:

1. Query the exact Project item and its content URL/repository/issue number, field names and values. Cross-repository issue queries may omit
   a card in another owner's Project; read the Project item directly before concluding membership is missing.
2. Verify all stage-required fields, correct options, agreed iteration, actual dates and explicitly justified blanks. Confirm the native
   parent separately. A successful mutation response or issue creation response is not sufficient readback.
3. Correct mismatches within the authorized scope and read back again. Preserve unrelated cards, issue states, relationships and fields.
4. If access, a missing schema option, an unresolved scheduling decision or unavailable historical evidence prevents completion, report the
   exact gap and next action. Do not describe issue setup as complete while a required value remains unresolved. Future lifecycle dates and
   an explicitly unscheduled backlog iteration are justified blanks, not errors.

This is an agent workflow requirement. Markdown and documentation checks do not inspect live Project fields; agents must perform the Project
readback explicitly. Existing GitHub automation can assist, but never replaces that verification.
