# ADR-0001: Use member-week identity for payroll claims

**Status:** Accepted

**Date:** 2026-08-23

**Decision owners:** CNC Portal maintainers

## Context

A weekly claim is the payroll aggregate used by daily claims, weekly goals, approval, and withdrawal. Its identity must therefore remain
stable when a member's wage changes. The former wage-week identity allowed more than one aggregate for the same member and ISO week, which
could split goals, hours, allowances, signatures, and terminal states across payroll records.

The affected [Payroll feature](../features/payroll/README.md) defines the current user-facing behaviour. The
[database schema](../../backend/prisma/schema.prisma), [claim controller](../../backend/src/controllers/claimController.ts), and
[weekly-claim controller](../../backend/src/controllers/weeklyClaimController.ts) are the executable implementation evidence.

## Decision

Weekly claims are identified by team, member, and ISO week, independently of wage version. The database enforces this identity with a unique
constraint, and claim and goals writes address the same member-week aggregate.

A daily claim binds a weekly aggregate to the wage that is current when that first daily claim is submitted. That wage remains the
historical pricing and allowance snapshot for later claims in the same week. A goals-only aggregate has not priced work yet, so its first
daily claim may bind the current wage at submission time.

New wage versions become current immediately. Payroll does not expose a scheduled or cancelled wage lifecycle.

The migration must preflight legacy member-week duplicates and stop when it finds any. It must not automatically merge or discard claims,
goals, signatures, or terminal states; those records require explicit reconciliation before the constraint can be applied.

## Considered Options

1. Keep wage-week uniqueness. This preserves version-specific rows but permits one member's weekly payroll state to split when their wage
   changes.
2. Schedule wage changes to start at a future boundary. This reduces some mid-week ambiguity but adds a lifecycle that does not cover
   goals-only rows and delays an owner's requested change.
3. Automatically merge duplicate legacy rows during migration. This would make rollout appear seamless, but no deterministic merge can
   preserve all conflicting daily claims, goals, signatures, and terminal states safely.

## Consequences

- One member has one payroll aggregate for each team and ISO week, so weekly caps, goals, and claim history are coherent.
- Mid-week wage changes affect new weeks while submitted work keeps its original pricing and allowance snapshot.
- Operators must reconcile legacy duplicate member-week records before migration can continue; deployment may be blocked until that work is
  complete.
- New payroll writes must use the member-week identity rather than treating a wage version as part of the aggregate key.
- The immediate-wage model removes scheduled-wage UI, API, and cancellation behaviour.

## Related Documentation

- [Payroll feature](../features/payroll/README.md)
- [Migration enforcing member-week uniqueness](../../backend/prisma/migrations/20260823194500_enforce_member_weekly_claim_uniqueness/migration.sql)
- [Architecture Decision Records](./README.md)
