# Architecture Decision Records

Architecture Decision Records (ADRs) preserve the durable rationale for consequential technical choices. They explain why a decision was
made, the alternatives considered, and the resulting trade-offs. They do not describe the current runtime behaviour in full or replace
active delivery tracking.

## When to Create an ADR

Create an ADR when a decision:

- affects more than one capability, subsystem, or team;
- establishes a long-lived engineering constraint or direction;
- has meaningful alternatives and trade-offs that future contributors need to understand; or
- changes a shared boundary, dependency, migration strategy, or security posture.

Do not create an ADR for routine implementation details, an isolated bug fix, or an active delivery plan. Keep current runtime behaviour in
[`docs/implementation/`](../implementation/README.md), product outcomes in [`docs/features/`](../features/README.md), exact interfaces in
source and generated artifacts, and active work or delivery history in GitHub issues, pull requests, and Git.

## Create a Record

1. Copy [`0000-template.md`](./0000-template.md) to `NNNN-kebab-case-title.md`, using the next unused four-digit number.
2. State the context, decision, alternatives, and consequences concisely. Link authoritative implementation, feature, contract, or delivery
   evidence instead of duplicating it.
3. Set the initial status to `Proposed`. Change it to `Accepted` once the decision is made.
4. When a later ADR replaces it, set the earlier record to `Superseded` and link to its replacement. Use `Deprecated` when it no longer
   applies without a successor.
5. Add the accepted record to the index below.

## Statuses

| Status       | Meaning                                                         |
| ------------ | --------------------------------------------------------------- |
| `Proposed`   | Under consideration; not yet a project constraint.              |
| `Accepted`   | The current decision and its documented trade-offs.             |
| `Superseded` | Replaced by a later ADR, which must be linked from this record. |
| `Deprecated` | No longer applies and has no direct replacement.                |

## Index

| ADR                                                | Title                                       | Status   | Date       |
| -------------------------------------------------- | ------------------------------------------- | -------- | ---------- |
| [ADR-0001](./0001-member-week-payroll-identity.md) | Use member-week identity for payroll claims | Accepted | 2026-08-23 |

## Related Documentation

- [Documentation hub](../README.md)
- [Implementation Documentation Guide](../platform/implementation-documentation-guide.md)
- [Architecture Overview](../platform/architecture.md)
