# Feature User Stories Index

**Status:** Navigation index

**Last updated:** 2026-08-21

User stories now live with the feature they describe. This file provides navigation only; it does
not own acceptance criteria, feature status, or effort estimates.

The former aggregate catalogue is preserved in Git history. It is no longer a current product source
because a global copy can drift independently from the feature, its implementation, and its human
review.

## Product Feature Stories

| Feature                                                                      | Scope                                               | Documentation state             |
| ---------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| [Payroll](./features/payroll/Readme.md)                                      | Wages, claims, approval, withdrawal, reconciliation | Existing stories; alignment due |
| [Safe Wallet](./features/safe/Readme.md)                                     | Setup, treasury, signers, transactions              | Existing stories; alignment due |
| [Vesting](./features/vesting/README.md)                                      | Complete Vesting V2 portal journey                  | Current model trial             |
| [Accounting migrations](./features/accounting/contract-migration-history.md) | Cross-contract accounting continuity                | Focused story set               |

`Alignment due` means that the feature already has local user stories, but it has not yet been
reviewed against the current
[Feature Documentation Guide](./platform/feature-specification-guide.md). It does not mean that the
product feature is incomplete.

## Contract Feature Stories

Contract behaviour and contract-scoped stories remain separate from product journeys. Start with the
[Contract Features Index](./features/contracts/README.md), then open the relevant contract.

Contract completion does not imply that a portal journey exists or has passed product review.

## Features Awaiting the Current Model

The documentation hub links the specialised or legacy documentation for Authentication, Backoffice,
Community Credit, RBAC, database seeding, serverless wake-up, and Statistics. Until a canonical
feature README is reviewed under the current model, those sources must not be treated as a completed
human acceptance record.

## Adding or Updating Stories

1. Open `docs/features/<feature>/README.md`.
2. Follow the [Feature Documentation Guide](./platform/feature-specification-guide.md).
3. Keep `As a`, `I want to`, and `So that` on separate lines.
4. Update this index only when a canonical feature entry point is added, renamed, or retired.
5. Keep delivery history in GitHub and Git rather than copying it into this index.
