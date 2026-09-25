# Cross-Layer Security Audit

**Audit ID:** `cross-layer-security`

## Objective

Determine whether authentication, authorization, validation, privacy, and failure guarantees remain consistent from the user action through
every backend, database, indexer, and contract boundary involved.

## Required Inputs

- canonical feature security and role rules;
- authentication, RBAC, request-validation, file-storage, and contract-interaction capability documentation;
- frontend guards and action availability;
- backend routes, middleware, controllers, services, validation, and persistence;
- contract modifiers, roles, ownership, value transfers, and emitted events;
- logs, telemetry, errors, and tests that may expose or record sensitive information.

## Audit Questions

- Is every state-changing path protected at all responsible layers?
- Can a route guard pass while a controller action violates resource ownership?
- Do frontend affordances, backend policy, and contract policy describe the same actor permissions?
- Can alternate parameters, action branches, stale state, or retries bypass validation?
- Are SIWE/session assertions bound to the intended identity, request, domain, chain, nonce, and lifetime?
- Can internal errors, logs, telemetry, URLs, or attachments disclose sensitive information?
- Does denial leave durable state unchanged, including after reconciliation jobs?
- Does a failure after an irreversible transaction create an unowned or unrecoverable state?

## Valid Findings

- authorization disagreement between layers;
- missing resource-level or action-level check;
- validation bypass through an alternate path;
- replay, stale-session, or identity-binding weakness;
- sensitive-data exposure or unjustified collection;
- partial-success state that cannot be securely recovered.

## Remediation

The agent may create regression tests and a draft implementation fix. Changes to authentication policy, roles, privileged contract
behaviour, PII collection, secret handling, or production access remain `assisted-pr` or `report-only`. The agent never rotates credentials
or changes production access by itself.

## Completion Evidence

The report traces one concrete action across every responsible layer, records the allowed and denied actors, identifies the bypass or
contradiction, and provides a reproducible test or proof. Scanner output without reachability and impact analysis is insufficient.
