---
name: cnc-code-audit
description: Audit the current CNC Portal checkout or a requested folder for clean code, maintainability, or code quality, and resume finding decisions or correction tracking. Use for scoped codebase audits rather than PR reviews or automatic implementation.
---

# CNC Code Audit

Deliver evidence-backed findings with concrete correction proposals and a resumable case register. Read the
[code-audit contract](../../../docs/development-guide/code-audit.md) for the finding schema, priority legend, decision history and delivery
states. It is the single owner of that output contract.

## Establish or Resume the Mandate

1. Read `AGENTS.md`, the local work logs, the requested scope and its canonical guides. Record the current revision, relevant local changes
   and inspection limits. Audit the requested checkout; preserve unrelated work.
2. Locate an existing report, case register and linked issues/PRs before starting a new run. Preserve case IDs and earlier decisions. For a
   correction-progress request, refresh the linked evidence instead of repeating an unrelated whole-codebase audit.
3. Keep the user's objective explicit: clean code, broader quality or a named concern. Record exclusions and inspect the relevant production
   consumers and tests; an out-of-scope boundary remains an explicit limit.
4. Separate authorized inspection/reporting, GitHub tracking, implementation and external actions. Apply the existing mandate; audit
   instructions alone do not request correction or publication. Use `cnc-pr-review` for a specific PR and its issue conformance.

## Investigate Efficiently

- Inventory the scoped authored sources, tests and configuration; exclude generated material without hiding handwritten adapters.
- Use existing checks and searches to choose representative paths and hotspots. Confirm responsibility, callers, expected behaviour and
  evidence before retaining a signal. Do not create a finding solely from size, occurrence count or an automated warning.
- For frontend work, follow the Vue, queries, utilities, formatting and testing owners linked from `AGENTS.md`. For another area, read its
  specialised guide and skill; do not import frontend conventions into unrelated code.
- Distinguish domain complexity and real technical boundaries from accidental abstraction. Prefer an existing owner, direct data flow and
  small public contracts over new controllers or transformation frameworks.
- When parallel audit work is requested or explicitly authorized by applicable instructions, use `cnc-work-orchestrator`: bounded read-only
  investigations, distinct responsibilities and one integration owner. Give each agent the same finding/output contract. Have another reader
  challenge high-impact or ambiguous findings when that adds useful confidence; do not require a fixed agent count.
- Run checks appropriate to the evidence needed. Record what actually ran, its revision, result and limitations. A passing suite does not
  prove that its tests exercise the subject instead of a mock, or that failure and recovery paths are correct.

## Recommend and Track

For every confirmed finding, provide the concrete correction required by the shared contract: what changes, the owning files and affected
consumers, expected behaviour, relevant trade-offs, and how to verify the result. A generic instruction such as “split this component” or
“improve tests” is incomplete. If a decision is needed, recommend an option with evidence and describe the alternatives; do not fabricate
acceptance or implement a guessed product rule.

Maintain the current case register as well as the report. Keep recommendation, actual decision, delivery stage, blockers and validation
separate. Append dated decision/change events with actor and evidence; preserve deferred, accepted-risk, rejected and completed cases.
Update states only from actual decisions and current proof. An issue closure, green CI or merged PR alone cannot mark a correction verified.

For authorized GitHub tracking, use `cnc-github-flow` and `gh`, reuse appropriate existing work, preserve native hierarchy and read back
published artifacts. Otherwise deliver the local report/register and clearly state that they are local. If GitHub is already authoritative,
label an unavailable refresh as unchecked/stale instead of silently treating a local snapshot as current.

## Validate and Deliver

- Challenge proposed fixes against actual consumers and the documented behaviour, deduplicate causes, and explain rejected candidates.
- Check stable IDs, links, priority definitions, totals, coverage limits and every confirmed case's correction/validation proposal.
- Check that choices are attributed to real evidence, integrated work is distinct from verified work, and remaining decisions/actions have
  owners or explicit unassigned state.
- Deliver a prioritized summary, the report and current register, executed checks and material limits. Update the local work logs to mark
  audit delivery complete while leaving corrections unimplemented or unverified unless evidence supports those states.
