---
name: Sprint Goal
about: Define a verifiable Sprint outcome
title: "[Goals] [OUTCOME] — Sprint [NUMBER]"
labels: ""
assignees: ""
---

**For the developer:** Complete the shared information and make the required decisions. If you use an AI agent, ask it to handle the
instructions and sections marked **AI agent only**, then review its proposals. If you do not use an agent, skip those instructions and
sections. Shared validation and evidence remain required as described in the contribution guide.

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

**AI agent only — skip without an agent:** Ask your agent to find relevant canonical references and propose the product story impact for
your review.

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

## Relationship validation plan — AI agent only

**AI agent only — skip without an agent:** Ask your agent to inspect the relevant expectations and consumers, then complete this plan before
implementation. Review its applicability, proposed proof and any decisions it raises. This issue table is optional when working without an
agent; shared relationship validation and PR evidence still apply.

Follow
[Development Relationship Validation](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/development-guide/relationship-validation.md)
at scoping and delivery. Assess every relationship type; explain grouped non-applicable types and link canonical expectations.

**Scope / canonical expectations:** [AFFECTED OUTCOME AND CANONICAL REFERENCES]

**Affected consumers:** [PARTICIPATING DOMAINS, INCLUDING UNCHANGED CONSUMERS]

| Check    | Source → target    | Guarantee / applicability reason       | Planned proof                  | Completion proposal / required decision |
| -------- | ------------------ | -------------------------------------- | ------------------------------ | --------------------------------------- |
| [REL-ID] | [EXACT REFERENCES] | [EXPECTED RESULT OR NON-APPLICABILITY] | [SMALLEST SUFFICIENT EVIDENCE] | [GAP, OWNER, NEXT ACTION, OR NONE]      |
