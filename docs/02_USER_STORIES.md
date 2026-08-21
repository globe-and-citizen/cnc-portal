# Feature User Stories Index

**Status:** Navigation index

**Last updated:** 2026-08-21

User stories live with the product capability they describe. This file maps the complete current
[Product Feature Inventory](./features/README.md) to its documentation owner; it does not duplicate
acceptance criteria, status, or effort estimates.

The former aggregate catalogue is preserved in Git history. It is no longer a current product source
because a global copy can drift independently from the feature, its implementation, and its human
review.

## Client Feature Coverage

| User capability         | Current documentation                                              | Documentation state               |
| ----------------------- | ------------------------------------------------------------------ | --------------------------------- |
| Authentication          | [Authentication reference](./auth/README.md)                       | Current model migration due       |
| Companies and workspace | —                                                                  | Canonical stories not yet written |
| Accounts                | [Safe stories](./features/safe/Readme.md)                          | Partial; complete journey due     |
| Payroll                 | [Payroll stories](./features/payroll/Readme.md)                    | Existing stories; alignment due   |
| Community Credit        | [Flow analysis](./features/community-credit/user-flow-analysis.md) | Current model migration due       |
| Accounting              | [Accounting references](./features/accounting/README.md)           | Current model migration due       |
| Contract Management     | —                                                                  | Canonical stories not yet written |
| SHER Token              | —                                                                  | Canonical stories not yet written |
| Governance              | —                                                                  | Canonical stories not yet written |
| Vesting                 | [Vesting stories](./features/vesting/README.md)                    | Current model trial               |

`Alignment due` or `migration due` describes documentation only. It does not mean that the product
capability is incomplete.

## Backoffice Feature Coverage

All administrator capabilities are grouped in the
[Backoffice Feature Inventory](./features/backoffice/README.md). Focused user stories belong under
`docs/features/backoffice/<capability>/README.md`; no dashboard capability owns a separate top-level
feature directory.

| Administrator capability | Current documentation                                               | Documentation state               |
| ------------------------ | ------------------------------------------------------------------- | --------------------------------- |
| Overview and statistics  | [Statistics references](./features/backoffice/statistics/README.md) | Current model migration due       |
| Team operations          | —                                                                   | Canonical stories not yet written |
| Micropayments            | —                                                                   | Canonical stories not yet written |
| Polymarket accounting    | —                                                                   | Canonical stories not yet written |
| Feature restrictions     | [Feature flags reference](./features/backoffice/feature-flags.md)   | Current model migration due       |
| Contract operations      | —                                                                   | Canonical stories not yet written |

## Contract Feature Stories

Contract behaviour and contract-scoped stories remain separate from product journeys. Start with the
[Contract Features Index](./features/contracts/README.md), then open the relevant contract.

Contract completion does not imply that a portal journey exists or has passed product review.

## Adding or Updating Stories

1. Confirm the capability and its product surface in the
   [Product Feature Inventory](./features/README.md).
2. Open `docs/features/<feature>/README.md` for the client or
   `docs/features/backoffice/<feature>/README.md` for the dashboard.
3. Follow the [Feature Documentation Guide](./platform/feature-specification-guide.md).
4. Keep `As a`, `I want to`, and `So that` on separate consecutive lines.
5. Update this index only when a canonical feature entry point is added, renamed, or retired.
6. Keep delivery history in GitHub and Git rather than copying it into this index.
