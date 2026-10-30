---
name: Release
about: Prepare, validate and track a repository release and its follow-up
title: "chore: 🔧 release vX.Y.Z"
labels: ""
assignees: ""
---

## Description

Prepare `vX.Y.Z` using the
[release procedure](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/platform/RELEASE_AUTOMATION.md). Describe the intended
outcome and release boundary. Link canonical feature documentation and delivery issues instead of copying their acceptance criteria or
declaring unverified product acceptance.

## Release coordinates

- Version and type: <vX.Y.Z; stable or prerelease>
- Previous release / comparison baseline: <tag and full commit SHA>
- Development baseline: <full develop commit SHA>
- Source branch and inspected head: <release/vX.Y.Z; full commit SHA>
- Target branch and inspected base: <main; full commit SHA>
- Promotion PR: <link when opened>
- Native parent: <Sprint Goal, coordinator or backlog issue; attach the native relationship separately>
- Kanban: <CNC Project card, Size, Status, Priority and agreed Sprint Iteration or explicitly unscheduled>

Maintain actual implementation dates and applicable fields under the
[Kanban field contract](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/development-guide/kanban-project.md).

## Scope

- Included changes: <linked delivery issues/PRs and affected product or technical surfaces>
- Excluded or deferred work: <links, reason and owner; None when empty>
- Compatibility and migrations: <affected consumers, prerequisites and decisions; None with a reason when irrelevant>
- Operational work: <deployment, contract upgrades, smoke checks or recovery work explicitly included, with owner and authorization;
  otherwise link separate follow-up issues>
- Known risks and release blockers: <issue links, mitigation, owner and required decision; None when empty>

## Owner and validator

- Release owner / assignee: <GitHub login>
- Independent technical reviewer: <GitHub login>
- Release decision owner: <person responsible for the final go/no-go>
- Product/QA validator: <person and required acceptance evidence, or not applicable with a reason>

## Canonical references

- Release procedure: [Release Automation](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/platform/RELEASE_AUTOMATION.md)
- Feature, contract and shared-runtime owners: <canonical documentation links, story/criterion IDs when applicable>
- Validation and recovery references: <test evidence, migration or recovery procedures; explain non-applicability>

## Acceptance Criteria

- [ ] Version, baseline, included changes, native parent, Kanban fields, owners and scope boundaries are recorded and verified.
- [ ] Applicable checks, documentation freshness and aggregate relationship validation are recorded against the inspected head/base;
      required blockers and decisions are resolved.
- [ ] Independent review and the required release decision / Product/QA acceptance are recorded; pending acceptance remains explicit.
- [ ] Promotion PR merged into `main`; the merge commit and required checks are linked and verified.
- [ ] Post-merge workflow result, annotated tag target, GitHub Release and expected artifacts are independently verified; partial
      publication or missing artifacts remain tracked as incomplete.
- [ ] Release-only changes are synchronized from `main` to `develop` through a linked, reviewed PR and verified merge, or no synchronization
      is needed with comparison evidence.
- [ ] In-scope operational work has its required evidence; separate follow-up issues have explicit owners and remaining limits are recorded
      before closure. Publication alone does not establish deployment or product acceptance.

## Relationship validation plan

Follow
[Development Relationship Validation](https://github.com/globe-and-citizen/cnc-portal/blob/develop/docs/development-guide/relationship-validation.md).
Assess every checklist type across the combined release. Reuse relevant source-PR evidence when its guarantee and dependencies are
unchanged; record new integration gaps and justify grouped non-applicable types. Aggregation alone is not a non-applicability reason.

**Scope / canonical expectations:** <release outcome, affected guarantees and canonical references>

**Affected consumers:** <participating features, shared capabilities, generations and operational consumers>

| Check    | Source → target    | Guarantee / applicability reason       | Planned proof                  | Completion proposal / required decision        |
| -------- | ------------------ | -------------------------------------- | ------------------------------ | ---------------------------------------------- |
| <REL-ID> | <exact references> | <expected result or non-applicability> | <smallest sufficient evidence> | <gap, owner/destination, next action, or None> |

## Evidence and follow-up

Record revisions, proof mode, links, actual outcomes and remaining limits. Keep preparation, merge, publication, deployment and human
acceptance distinct.

- Pre-merge validation / review / acceptance: <head/base, checks and decisions>
- Promotion merge / publication: <merge SHA, workflow run, tag target, Release and artifact inventory>
- Post-release synchronization: <issue/PR, compared main/develop revisions and merge evidence, or justified no-op>
- Operational results / remaining work: <observed results or explicitly unexecuted checks, owner and follow-up links>
