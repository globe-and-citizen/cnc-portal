# User Journey Audit

**Audit ID:** `user-journey`

## Objective

Determine whether a coherent actor can complete, recover, and later revisit a documented business objective through supported product
actions while the expected backend, database, and blockchain state remains consistent.

## Required Inputs

- canonical feature journeys and acceptance criteria;
- [`../../testing/e2e-paths.md`](../../testing/e2e-paths.md) and the relevant G0-G7 paths;
- routes, navigation, guards, components, mutations, backend endpoints, contracts, and persistence used by the path;
- browser-acceptance and integrated E2E evidence;
- user-visible error, loading, empty, retry, refresh, and permission states.

## Audit Questions

- Does the path begin with realistic actor state and use only supported user actions?
- Is setup incorrectly counted as proof of the behaviour it seeds?
- Do later steps consume state created by the earlier user actions?
- Are transaction receipt, backend persistence, refreshed reads, and visible UI checked where responsible?
- Are wallet rejection, chain revert, backend failure, retry, refresh, and partial-success recovery coherent?
- Can different roles complete only their authorized branches?
- Do keyboard order, focus, labels, feedback, and responsive presentation preserve comprehension of the path?
- Is a destructive terminal action isolated from reusable path state?

## Valid Findings

- incomplete or impossible documented path;
- hidden direct state injection presented as user proof;
- success reported before durable confirmation;
- missing recovery from a realistic partial failure;
- cross-role or refresh inconsistency;
- semantically inaccessible interaction that blocks the business objective.

## Remediation

The agent may add or restructure tests and correct explicit recovery behaviour through an autonomous draft PR. Product-flow changes, new
user choices, or disputed UX intent use `assisted-pr`. Visual preference alone is not a finding without a usability or accessibility
consequence.

## Completion Evidence

The report names the actor, starting state, ordered actions, responsible boundaries, persisted outcome, failure branch, and exact evidence
added or corrected. Integrated status requires a user action plus durable backend/database or real-chain evidence and refreshed UI.
