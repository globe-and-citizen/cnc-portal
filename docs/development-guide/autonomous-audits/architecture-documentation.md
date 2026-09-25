# Architecture and Documentation Audit

**Audit ID:** `architecture-documentation`

## Objective

Determine whether responsibilities, abstractions, public surfaces, and canonical documentation still describe the system that actually
exists and support its current product goals.

## Required Inputs

- product and implementation inventories;
- canonical feature, capability, contract, testing, and development documentation;
- ADRs and active architecture exceptions;
- routes, navigation, APIs, stores, composables, controllers, services, schemas, contracts, and indexers;
- static-analysis candidates and architecture checks as discovery inputs;
- recent changes that altered responsibilities or removed consumers.

## Audit Questions

- Is each responsibility owned by the appropriate layer and documented once?
- Do abstractions reduce meaningful duplication, or only hide domain behaviour and ownership?
- Are public exports and shared utilities used by production responsibilities rather than tests alone?
- Does documentation promise behaviour that implementation cannot guarantee?
- Are reachable product capabilities missing from the inventory, or documented capabilities no longer reachable?
- Do feature and capability documents contradict each other about ownership or runtime boundaries?
- Have temporary exceptions, compatibility paths, or generated artefacts become permanent without a current rationale?
- Would a proposed cleanup remove dynamic, framework, test-owned, or future migration usage?

## Valid Findings

- responsibility in the wrong layer or duplicated across layers;
- misleading abstraction or public API surface;
- semantic documentation drift or conflicting authorities;
- orphaned reachable feature or documented but unavailable capability;
- stale exception or compatibility path with verified replacement;
- confirmed dead production surface after dynamic usage has been ruled out.

## Remediation

The agent may autonomously update misleading documentation, reduce a proven test-only surface, or perform a bounded refactor with preserved
behaviour and tests. Product-scope changes, broad rewrites, uncertain dead-code deletion, and architectural choices with multiple valid
directions use `assisted-pr`.

## Completion Evidence

The report identifies the current responsibility, intended owner, consumers, evidence of drift, and why the proposed boundary is preferable.
File size, duplication count, Knip output, or complexity metrics alone are not findings.
