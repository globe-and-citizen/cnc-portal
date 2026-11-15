---
name: Sprint Goal
about: Define a verifiable Sprint outcome
title: "[Goals] [OUTCOME] — Sprint [NUMBER]"
labels: ""
assignees: ""
---

<!--
Use this template for a specific, verifiable Sprint Goal and attach it as a
native sub-issue of its Sprint plan. Use the Sprint Category template for transverse coordination.
-->

## Goal type

<!-- State the kind of outcome, such as Product, Quality, Technical, or Documentation. -->

[GOAL TYPE]

## Expected outcome

<!-- Describe what can be verified by the end of the Sprint, beyond a list of tasks. -->

[OBSERVABLE SPRINT OUTCOME]

## Exit criteria

- [ ] [OBSERVABLE RESULT AND REQUIRED EVIDENCE]
- [ ] [VALIDATION OR REVIEW NEEDED BEFORE CLOSURE]

## Product story impact

<!-- Choose None, Adds, Changes, or Implements existing criteria, and explain why. -->

`[STORY IMPACT]`

**Reason:** [STORY IMPACT RATIONALE]

## Canonical references

<!-- Link the owning US/AC when behaviour is affected; otherwise link the applicable technical or documentation owner. -->

- [CANONICAL REFERENCE AND RELEVANT CRITERION]

## Owner and validator

Delivery owner: [OWNER]

Product/QA or technical validator: [VALIDATOR]

## Scope boundary

<!-- State what belongs in this Goal and what belongs elsewhere. -->

[SCOPE BOUNDARY]

Parent Sprint: [SPRINT ISSUE NUMBER].

## Tracked work

<!-- Add native child issues here as they are scoped; keep status and evidence in sync with the children. -->

- [ ] [CHILD ISSUE NUMBER] — [DELIVERABLE OR COORDINATION ITEM]

## Before implementation

The delivery owner records the applicable
[relationship validation plan](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/development-guide/relationship-validation.md)
in this issue before implementation. It may be prepared by an agent or by a developer working without one. Link canonical expectations and
record affected consumers, applicability, planned proof and any decisions or completion proposals.

<details>
<summary>AI agent instructions</summary>

- Read the shared contribution requirements and `AGENTS.md`; confirm the intended scope and surface missing human decisions.
- Prepare the relationship validation plan before implementation, including unchanged consumers and reasons for non-applicable checks.
- Follow the relevant repository skill, maintain the issue and Project fields, and record validation evidence and remaining gaps.
- Do not claim human acceptance or make product decisions on behalf of the designated validator.

</details>
