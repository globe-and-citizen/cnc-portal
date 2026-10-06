---
name: Sprint Goal
about: Define a verifiable Sprint outcome or its Bug and perf coordination Goal
title: "[Goals] [OUTCOME] — Sprint [NUMBER]"
labels: ""
assignees: ""
---

<!--
Use this template for a planned Sprint Goal. For the separate catch-all Goal,
change the title to `[Goals] Sprint [NUMBER] Bug and perf` and describe the
coordination outcome and exit criteria for unrelated corrective or technical work.
Attach either Goal as a native sub-issue of its Sprint plan.
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

<!-- State what belongs in this Goal and what belongs elsewhere. For Bug and perf, exclude the Sprint's original outcomes. -->

[SCOPE BOUNDARY]

Parent Sprint: [SPRINT ISSUE NUMBER].

## Tracked work

<!-- Add native child issues here as they are scoped; keep status and evidence in sync with the children. -->

- [ ] [CHILD ISSUE NUMBER] — [DELIVERABLE OR COORDINATION ITEM]

## Relationship validation plan

Follow
[Development Relationship Validation](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/development-guide/relationship-validation.md)
at scoping and delivery. Assess every relationship type; explain grouped non-applicable types and link canonical expectations.

**Scope / canonical expectations:** [AFFECTED OUTCOME AND CANONICAL REFERENCES]

**Affected consumers:** [PARTICIPATING DOMAINS, INCLUDING UNCHANGED CONSUMERS]

| Check    | Source → target    | Guarantee / applicability reason       | Planned proof                  | Completion proposal / required decision |
| -------- | ------------------ | -------------------------------------- | ------------------------------ | --------------------------------------- |
| [REL-ID] | [EXACT REFERENCES] | [EXPECTED RESULT OR NON-APPLICABILITY] | [SMALLEST SUFFICIENT EVIDENCE] | [GAP, OWNER, NEXT ACTION, OR NONE]      |
