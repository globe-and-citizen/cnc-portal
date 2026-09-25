# Operational and Release Risk Audit

**Audit ID:** `operational-release-risk`

## Objective

Determine whether a change or release can be migrated, observed, diagnosed, recovered, and operated safely, beyond the fact that required CI
checks passed.

## Required Inputs

- diff from the last released or selected baseline revision;
- deployment, migration, rollback, backup, recovery, and incident documentation;
- changed feature, capability, contract, schema, environment, and workflow documentation;
- health checks, logs, telemetry, alerts, error handling, and operational ownership;
- relevant user journeys and failure-recovery tests;
- release notes and unresolved findings from all other semantic audits.

## Audit Questions

- Which user journeys, persisted data, contracts, and external dependencies changed?
- Can old and new application versions coexist during rollout and rollback?
- Are schema and data migrations forward-safe, replayable, and observable?
- Would the most important failures produce enough context for diagnosis without exposing sensitive data?
- Are alerts tied to user or business impact rather than raw noise?
- Can operators detect partial deployment, stale ABI/address, indexer lag, or cross-service version mismatch?
- Is rollback technically possible after each irreversible boundary?
- Are backups, restoration assumptions, and incident steps current and testable?
- Does the release contain unresolved high-severity audit findings or undocumented operational decisions?

## Valid Findings

- release or migration with an unmitigated compatibility window;
- failure that is neither observable nor diagnosable;
- rollback or recovery instruction contradicted by current implementation;
- silent cross-service, ABI, address, or indexer mismatch;
- telemetry that leaks sensitive data or lacks actionable context;
- green CI with unresolved semantic risk to an affected journey.

## Remediation

The agent may add diagnostics, health assertions, migration tests, compatibility guards, rollback documentation, or a bounded
release-workflow fix. Production deployment, destructive restore, traffic switching, secret changes, contract upgrades, incident
declaration, and final release approval remain `report-only` human actions.

## Completion Evidence

The report identifies the release baseline, affected surfaces, irreversible boundaries, detection signal, recovery path, validation
evidence, and residual risk. It distinguishes local checks, CI evidence, deployment readiness, and confirmed production state.
