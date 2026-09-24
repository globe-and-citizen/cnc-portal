# Payroll & Cash Remuneration — User Stories

**Scope:** Wage configuration, weekly goals, daily work claims, approval, withdrawal, and payroll history

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).

## Product Model

A wage is an off-chain, versioned record that defines a member's standard and optional overtime rates, weekly allowance, and daily
allowance. A daily claim records work in ten-minute increments. Each company member has at most one weekly claim per ISO week. The first
submitted daily claim binds that weekly claim to the current wage; every later claim for the same week reuses that row and wage, even when
the owner changes the member's current wage. A goals-only weekly row has priced no work yet, so its first daily claim can bind it to the
wage that is current at submission time.

A wage change creates a new current version immediately. Payroll does not schedule wage changes or delay their effective date. Existing
weekly claims keep their stored wage so historical hours, limits, approvals, and payments are not repriced.

Member-wage summaries in company-list responses remain scoped to the requesting member's explicitly selected companies. They do not make
platform-wide company or payroll data available to regular users.

When historical data contains more than one weekly claim for the same company member and ISO week, the database migration stops before it
changes the uniqueness rule. The affected claims, goals, signatures, and terminal states must be reconciled explicitly; no payroll data is
silently merged or discarded.

Approval is an EIP-712 signature from the current Cash Remuneration contract owner. It does not move funds. The member submits the signed
weekly claim on-chain to receive native tokens and supported ERC-20 assets; SHER compensation is minted when the current contract
configuration supports it.

The company Bank can fund the Cash Remuneration contract through its normal transfer actions. This is not a `transferFrom` operation, and
its complete journey belongs to the Accounts feature.

## Lifecycle

1. The company owner sets a wage for the member.
2. The owner funds the Cash Remuneration contract when non-mintable assets are required.
3. The member optionally sets weekly goals and submits daily claims.
4. The member can edit or delete claims while the week is pending.
5. Once the week is complete, the Cash Remuneration owner signs the weekly claim.
6. The member withdraws the signed claim on-chain.
7. The portal reconciles the stored status with the current contract.

## Status Overview

| User Story     | Title                                      | Actor                  | Status         |
| -------------- | ------------------------------------------ | ---------------------- | -------------- |
| US-PAYROLL-001 | Set a member's wage                        | Company owner          | 🧪 Validation  |
| US-PAYROLL-002 | Pause or resume a member's wage            | Company owner          | 🧪 Validation  |
| US-PAYROLL-003 | Fund the Payroll contract                  | Bank owner / Board     | 🔗 Reference   |
| US-PAYROLL-004 | Set weekly goals                           | Company member         | 🧪 Validation  |
| US-PAYROLL-005 | Submit a daily claim                       | Company member         | 🧪 Validation  |
| US-PAYROLL-006 | Edit a daily claim                         | Company member         | 🚧 In Progress |
| US-PAYROLL-007 | Delete a daily claim                       | Company member         | 🚧 In Progress |
| US-PAYROLL-008 | Sign a completed weekly claim              | Contract owner         | 🧪 Validation  |
| US-PAYROLL-009 | Disable or re-enable a signed weekly claim | Contract owner         | 🚧 In Progress |
| US-PAYROLL-010 | Withdraw an approved weekly claim          | Paid member            | 🧪 Validation  |
| US-PAYROLL-011 | Reconcile weekly claims with the chain     | System                 | 🧪 Validation  |
| US-PAYROLL-012 | Review payroll history                     | Company member / owner | 🧪 Validation  |
| US-PAYROLL-013 | Review the Payroll account position        | Company member         | 🚧 In Progress |

## Test Coverage Overview

| User Story     | E2E Status      | Owning Path              |
| -------------- | --------------- | ------------------------ |
| US-PAYROLL-001 | 📋 Planned      | E2E-PATH-11              |
| US-PAYROLL-002 | 📋 Planned      | E2E-PATH-11              |
| US-PAYROLL-003 | ➖ Not required | E2E-PATH-02 owns funding |
| US-PAYROLL-004 | 📋 Planned      | E2E-PATH-12              |
| US-PAYROLL-005 | 📋 Planned      | E2E-PATH-12              |
| US-PAYROLL-006 | 📋 Planned      | E2E-PATH-12              |
| US-PAYROLL-007 | 📋 Planned      | E2E-PATH-12              |
| US-PAYROLL-008 | 📋 Planned      | E2E-PATH-13              |
| US-PAYROLL-009 | 📋 Planned      | E2E-PATH-13              |
| US-PAYROLL-010 | 📋 Planned      | E2E-PATH-13              |
| US-PAYROLL-011 | 📋 Planned      | E2E-PATH-13              |
| US-PAYROLL-012 | 📋 Planned      | E2E-PATH-13              |
| US-PAYROLL-013 | 📋 Planned      | Not yet assigned         |

Criteria tagged _(API)_ or _(contract)_ describe outcomes that cannot be confirmed from the portal alone.

## US-PAYROLL-001: Set a Member's Wage

**As a** company owner\
**I want to** set a member's hourly rates and hour limits\
**So that** they can submit claims for fair, bounded compensation

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-001-01` A company owner can set a wage for any company member.
- [x] `AC-US-PAYROLL-001-02` A successful wage request persists a new version that subsequent member-wage reads return.
- [x] `AC-US-PAYROLL-001-03` Member-wage reads expose the standard rates, overtime rates, weekly allowance, and daily allowance.

#### Business Rules

- [x] `AC-US-PAYROLL-001-04` A wage belongs to one member and stores standard rates separately from optional overtime rates.
- [x] `AC-US-PAYROLL-001-05` Standard rates support the network-native token, USDC, and SHER.
- [x] `AC-US-PAYROLL-001-06` At least one standard token rate must be enabled with a positive value.
- [x] `AC-US-PAYROLL-001-07` A disabled token rate is submitted as zero.
- [x] `AC-US-PAYROLL-001-08` The regular weekly allowance is a whole number from 1 to 40 hours.
- [x] `AC-US-PAYROLL-001-09` The daily allowance is a whole number from 1 to 24 hours.
- [x] `AC-US-PAYROLL-001-10` The daily allowance defaults to 8 hours.
- [x] `AC-US-PAYROLL-001-11` The daily allowance remains a per-day cap even when the weekly allowance still has unused capacity.
- [x] `AC-US-PAYROLL-001-12` Overtime configuration requires at least one positive overtime rate.
- [x] `AC-US-PAYROLL-001-13` The overtime allowance is a whole number from 1 to 20 hours.
- [x] `AC-US-PAYROLL-001-14` A replacement wage references the operative wage as its predecessor without overwriting version history.
- [x] `AC-US-PAYROLL-001-15` A new wage version becomes current immediately without a future activation option.
- [x] `AC-US-PAYROLL-001-16` A weekly claim containing daily claims retains its initial wage for the pricing and validation of all later
      claims in that ISO week.
- [x] `AC-US-PAYROLL-001-17` The first daily claim in a goals-only weekly row uses the member's current wage.
- [x] `AC-US-PAYROLL-001-18` _(database)_ At most one weekly claim can exist for each company, member, and ISO week.
- [x] `AC-US-PAYROLL-001-19` _(migration)_ Legacy duplicate member-week records stop the migration for explicit reconciliation instead of
      losing claims, goals, signatures, or terminal states.
- [x] `AC-US-PAYROLL-001-20` The wage lifecycle has no cancellation operation.
- [x] `AC-US-PAYROLL-001-21` Only company owners can set wages.
- [x] `AC-US-PAYROLL-001-22` Every wage version is stored off-chain.
- [x] `AC-US-PAYROLL-001-23` The wage endpoint returns the current wage.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-001-24` Member-wage reads distinguish members who do not have a wage.
- [x] `AC-US-PAYROLL-001-25` A disabled wage cannot be replaced until the owner resumes it.
- [x] `AC-US-PAYROLL-001-26` Archived companies cannot create wages.
- [x] `AC-US-PAYROLL-001-27` Archived companies cannot replace wages.

**Dependencies:** Companies and Workspace

## US-PAYROLL-002: Pause or Resume a Member's Wage

**As a** company owner\
**I want to** pause a member's wage and resume it later\
**So that** I can freeze payroll activity without deleting wage history

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-002-01` The owner can pause an active wage.
- [x] `AC-US-PAYROLL-002-02` The owner can resume a paused wage.
- [x] `AC-US-PAYROLL-002-03` Resuming a wage restores daily-claim actions.
- [x] `AC-US-PAYROLL-002-04` Resuming a wage permits the owner to replace it.

#### Business Rules

- [x] `AC-US-PAYROLL-002-05` A paused wage blocks new daily claims.
- [x] `AC-US-PAYROLL-002-06` A paused wage blocks daily-claim edits.
- [x] `AC-US-PAYROLL-002-07` A paused wage blocks daily-claim deletion.
- [x] `AC-US-PAYROLL-002-08` A paused wage blocks replacement wages.
- [x] `AC-US-PAYROLL-002-09` Non-owners cannot change the wage status.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-002-10` The status of a missing wage cannot be changed.
- [x] `AC-US-PAYROLL-002-11` The status of a historical wage cannot be changed.
- [x] `AC-US-PAYROLL-002-12` The wage status of an archived company cannot be changed.

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-003: Fund the Payroll Contract

**As a** Bank owner or Board member\
**I want to** transfer treasury assets to the Cash Remuneration contract\
**So that** members can withdraw compensation paid in non-mintable assets

This is a reference story. The Accounts feature owns the complete Bank transfer journey.

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-003-01` The Bank owner can send native assets to the Cash Remuneration address.
- [x] `AC-US-PAYROLL-003-02` The Bank owner can send supported ERC-20 assets to the Cash Remuneration address.
- [x] `AC-US-PAYROLL-003-03` The Cash Remuneration contract can receive native assets.
- [x] `AC-US-PAYROLL-003-04` The Cash Remuneration contract can receive supported ERC-20 assets.

#### Business Rules

- [x] `AC-US-PAYROLL-003-05` _(contract)_ SHER compensation follows the configured Investor minting path instead of requiring a prefunded
      SHER balance.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-003-06` _(contract)_ A withdrawal in a non-mintable asset fails when the Cash Remuneration contract lacks the required
      balance.

**Accounting:** Funding is a company-pocket movement booked by
[`UC-BANK-03`](../accounting/journal-entry-catalogue.md#uc-bank-03--bank-funds-a-company-pocket) or
[`INTERNAL`](../accounting/journal-entry-catalogue.md#internal--other-company-pocket-transfer); it is not payroll expense.

**Dependencies:** Accounts, [Bank contract](../../contracts/features/bank/README.md)

## US-PAYROLL-004: Set Weekly Goals

**As a** company member\
**I want to** record my goals for an ISO week\
**So that** my planned work is visible beside my submitted claims

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-004-01` A member with a wage can submit a free-form Markdown goals memo.
- [x] `AC-US-PAYROLL-004-02` Goals can create a pending weekly claim before any daily hours are submitted.
- [x] `AC-US-PAYROLL-004-03` Saving again updates the single goals memo for that member and week.
- [x] `AC-US-PAYROLL-004-04` Goals can be cleared with an empty memo.

#### Business Rules

- [x] `AC-US-PAYROLL-004-05` Each member and ISO week has at most one goals memo.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-004-06` A member without an applicable wage cannot create a weekly goals record.
- [x] `AC-US-PAYROLL-004-07` Goals are read-only once the week is signed.
- [x] `AC-US-PAYROLL-004-08` Goals are read-only once the week is withdrawn.
- [x] `AC-US-PAYROLL-004-09` Goals are read-only once the week is disabled.
- [x] `AC-US-PAYROLL-004-10` Archived companies cannot create weekly goals.
- [x] `AC-US-PAYROLL-004-11` Archived companies cannot update weekly goals.

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-005: Submit a Daily Claim

**As a** company member\
**I want to** log the work completed on a given day\
**So that** it can be included in my weekly compensation

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-005-01` A member can submit a daily claim for themselves.
- [x] `AC-US-PAYROLL-005-02` A successful submission persists the daily claim and exposes it through subsequent weekly-claim reads.

#### Business Rules

- [x] `AC-US-PAYROLL-005-03` A daily claim stores its work date in UTC.
- [x] `AC-US-PAYROLL-005-04` A daily-claim duration must be greater than 0.
- [x] `AC-US-PAYROLL-005-05` A daily-claim duration must use ten-minute increments.
- [x] `AC-US-PAYROLL-005-06` A daily-claim duration cannot exceed 24 hours.
- [x] `AC-US-PAYROLL-005-07` A daily-claim duration cannot exceed the wage's lower daily allowance.
- [x] `AC-US-PAYROLL-005-08` A daily-claim memo must contain 1 to 3,000 characters after trimming.
- [x] `AC-US-PAYROLL-005-09` A daily claim can contain at most ten attachments.
- [x] `AC-US-PAYROLL-005-10` Daily-allowance validation adds the new duration to the existing claims for the selected work date.
- [x] `AC-US-PAYROLL-005-11` _(API)_ The weekly total cannot exceed the combined regular and overtime allowances.
- [x] `AC-US-PAYROLL-005-12` _(API)_ The server enforces the daily allowance with an 8-hour fallback for legacy wages.
- [x] `AC-US-PAYROLL-005-13` When submission restriction is active, the portal accepts claims only for the current ISO week.
- [x] `AC-US-PAYROLL-005-14` _(API)_ When submission restriction is active, the API accepts claims only for the current ISO week.
- [x] `AC-US-PAYROLL-005-15` When submission restriction is active, the portal accepts work dates at most four days in the past.
- [x] `AC-US-PAYROLL-005-16` _(API)_ When submission restriction is active, the API accepts work dates at most four days in the past.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-005-17` A daily claim submitted for another member is rejected.
- [x] `AC-US-PAYROLL-005-18` A daily claim submitted without an applicable wage is rejected.
- [x] `AC-US-PAYROLL-005-19` A signed week or a week that already carries a signature rejects new daily claims.
- [x] `AC-US-PAYROLL-005-20` A withdrawn week rejects new daily claims.
- [x] `AC-US-PAYROLL-005-21` A disabled week rejects new daily claims.
- [x] `AC-US-PAYROLL-005-22` A paused wage rejects new claims.
- [x] `AC-US-PAYROLL-005-23` A rejected submission leaves the daily-claim state unchanged and returns its rejection reason.
- [x] `AC-US-PAYROLL-005-24` An attachment with an unsupported file type is rejected before the daily claim is submitted.
- [x] `AC-US-PAYROLL-005-25` An attachment larger than 10 MB is rejected before the daily claim is submitted.

**Accounting:** The daily claim changes the source amount for
[`UC-CASH-02`](../accounting/journal-entry-catalogue.md#uc-cash-02--weekly-wage-accrual). The journal entry is created only after the
containing work week ends and remains eligible.

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-006: Edit a Daily Claim

**As a** company member\
**I want to** correct a daily claim\
**So that** mistakes can be fixed before the week is approved

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-006-01` The claim owner can edit the duration, memo, and attachments while the week is pending.
- [x] `AC-US-PAYROLL-006-02` A successful edit persists the new claim values.

#### Business Rules

- [x] `AC-US-PAYROLL-006-03` Editing cannot change the claim's original work date.
- [x] `AC-US-PAYROLL-006-04` The update API permits a partial update without a memo.
- [x] `AC-US-PAYROLL-006-05` A supplied memo must contain 1 to 3,000 characters after trimming.
- [x] `AC-US-PAYROLL-006-06` The combined existing and new attachment count cannot exceed ten.
- [x] `AC-US-PAYROLL-006-07` _(API)_ The weekly allowance is rechecked while excluding the claim being edited.
- [x] `AC-US-PAYROLL-006-08` _(API)_ The daily allowance is rechecked for the original work date while excluding the claim being edited.
- [x] `AC-US-PAYROLL-006-09` A user other than the claim owner cannot edit the claim.
- [ ] `AC-US-PAYROLL-006-10` The API rejects claim edits when the weekly claim is disabled.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-006-11` A paused wage blocks claim editing.
- [x] `AC-US-PAYROLL-006-12` A rejected edit leaves the stored claim unchanged and returns its rejection reason.
- [x] `AC-US-PAYROLL-006-13` Archived companies cannot edit claims.

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-007: Delete a Daily Claim

**As a** company member\
**I want to** delete a daily claim entered by mistake\
**So that** it is removed before the week is approved

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-007-01` A confirmed deletion removes the claim and its stored attachments from subsequent weekly-claim reads.

#### Business Rules

- [x] `AC-US-PAYROLL-007-02` Deleting a daily claim requires its owner's confirmation before stored data changes.
- [x] `AC-US-PAYROLL-007-03` Deleting the final daily claim removes an otherwise empty weekly claim but preserves one that still contains
      goals.
- [x] `AC-US-PAYROLL-007-04` A user other than the claim owner cannot delete the claim.
- [ ] `AC-US-PAYROLL-007-05` The API rejects claim deletion when the weekly claim is disabled.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-007-06` A paused wage blocks claim deletion.
- [x] `AC-US-PAYROLL-007-07` Archived companies cannot delete claims.
- [x] `AC-US-PAYROLL-007-08` A failed deletion leaves the stored claim unchanged and returns a failure outcome.

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-008: Sign a Completed Weekly Claim

**As a** Cash Remuneration contract owner\
**I want to** sign a member's completed weekly claim\
**So that** the member is authorised to withdraw that week's compensation

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-008-01` Only the current Cash Remuneration contract owner can initiate signing through the product journey.
- [x] `AC-US-PAYROLL-008-02` Signing requests an EIP-712 wallet signature bound to Cash Remuneration version 1, the active contract, and the
      active chain.

#### Business Rules

- [x] `AC-US-PAYROLL-008-03` The API authorizes only the current Cash Remuneration contract owner.
- [x] `AC-US-PAYROLL-008-04` The product journey permits signing only when the weekly claim contains at least one daily claim.
- [x] `AC-US-PAYROLL-008-05` _(API)_ The backend rejects signing a goals-only weekly claim before storing a signature or changing its
      status.
- [x] `AC-US-PAYROLL-008-06` Normal signing applies only to pending weeks.
- [x] `AC-US-PAYROLL-008-07` A disabled claim uses the explicit re-sign flow.
- [x] `AC-US-PAYROLL-008-08` Re-signing a disabled current-contract claim re-enables its existing signature before storing the replacement.
- [x] `AC-US-PAYROLL-008-09` _(API)_ The signed-against contract must match the company's current Cash Remuneration contract.
- [x] `AC-US-PAYROLL-008-10` _(API)_ The recovered signer must match the caller.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-008-11` The current week cannot be signed.
- [x] `AC-US-PAYROLL-008-12` A future week cannot be signed.
- [x] `AC-US-PAYROLL-008-13` Archived companies cannot sign weekly claims.
- [x] `AC-US-PAYROLL-008-14` Companies that have not migrated to the current Officer generation cannot sign weekly claims.
- [x] `AC-US-PAYROLL-008-15` Rejecting the wallet signature leaves the weekly claim's stored status and signature unchanged.
- [x] `AC-US-PAYROLL-008-16` Reconciliation clears a previous-contract signature and returns its weekly claim to pending.

**Accounting:** Signing authorizes settlement but does not trigger the wage accrual; `UC-CASH-02` is dated at the end of the eligible work
week.

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-009: Disable or Re-enable a Signed Weekly Claim

**As a** Cash Remuneration contract owner\
**I want to** disable a signed weekly claim and re-enable it if appropriate\
**So that** I can stop its payout before the member withdraws

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-009-01` The current Cash Remuneration owner can disable a signed claim on-chain.
- [x] `AC-US-PAYROLL-009-02` The owner can re-enable a disabled claim that has an existing signature.
- [x] `AC-US-PAYROLL-009-03` A successful on-chain disable operation reconciles the stored weekly claim to disabled.
- [x] `AC-US-PAYROLL-009-04` A successful on-chain enable operation reconciles the stored weekly claim to signed.

#### Business Rules

- [x] `AC-US-PAYROLL-009-05` Users who are not the Cash Remuneration owner cannot invoke the contract actions.
- [ ] `AC-US-PAYROLL-009-06` The legacy weekly-claim update API does not change stored status without the matching on-chain action.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-009-07` A withdrawn claim cannot transition to disabled.
- [x] `AC-US-PAYROLL-009-08` A withdrawn claim cannot transition to enabled.

**Accounting:** A disabled weekly claim is excluded from
[`UC-CASH-02`](../accounting/journal-entry-catalogue.md#uc-cash-02--weekly-wage-accrual); re-enabling it restores eligibility.

**Dependencies:** US-PAYROLL-008

## US-PAYROLL-010: Withdraw an Approved Weekly Claim

**As a** paid company member\
**I want to** withdraw my signed weekly claim\
**So that** I receive the approved compensation in my wallet

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-010-01` Only the member named by a signed weekly claim can initiate its withdrawal.
- [x] `AC-US-PAYROLL-010-02` Withdrawal sends the complete native-token, ERC-20, and mintable-token wage payload on-chain.
- [x] `AC-US-PAYROLL-010-03` A successful withdrawal transfers the approved compensation.
- [x] `AC-US-PAYROLL-010-04` A successful withdrawal reconciles the stored status with the contract.

#### Business Rules

- [x] `AC-US-PAYROLL-010-05` _(API)_ Only the member named by the weekly claim can mark it as withdrawn.
- [x] `AC-US-PAYROLL-010-06` A signature bound to another Cash Remuneration contract or network is rejected before the transaction.
- [x] `AC-US-PAYROLL-010-07` A signature that no longer recovers the current contract owner is rejected.
- [x] `AC-US-PAYROLL-010-08` _(contract)_ The caller must match the employee encoded by the signed claim.
- [x] `AC-US-PAYROLL-010-09` Product withdrawal requires both signed status and a stored signature.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-010-10` A paid claim cannot be withdrawn.
- [x] `AC-US-PAYROLL-010-11` A claim belonging to an archived company cannot be withdrawn.
- [x] `AC-US-PAYROLL-010-12` _(contract)_ A paid claim reverts.
- [x] `AC-US-PAYROLL-010-13` _(contract)_ A disabled claim reverts.
- [x] `AC-US-PAYROLL-010-14` _(contract)_ A claim with an unsupported token reverts.
- [x] `AC-US-PAYROLL-010-15` _(contract)_ A claim reverts when the Cash Remuneration contract lacks the required balance.
- [x] `AC-US-PAYROLL-010-16` _(contract)_ A withdrawal reverts while the Cash Remuneration contract is paused.
- [x] `AC-US-PAYROLL-010-17` Cancelling the wallet transaction leaves the claim unpaid and its stored status unchanged.

**Accounting:** A successful withdrawal settles the obligation through
[`UC-CASH-03`](../accounting/journal-entry-catalogue.md#uc-cash-03--wage-settlement). Cash credits Payroll cash; SHER moves promised shares
into Investor Equity.

**Dependencies:** US-PAYROLL-008, US-PAYROLL-003

## US-PAYROLL-011: Reconcile Weekly Claims With the Chain

**As a** system\
**I want to** reconcile signed and disabled weekly claims with the active contract\
**So that** the portal reflects paid, disabled, and stale-signature state

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-011-01` Reconciliation evaluates every signed or disabled weekly claim.
- [x] `AC-US-PAYROLL-011-02` Reconciliation updates a paid weekly claim to withdrawn.
- [x] `AC-US-PAYROLL-011-03` Reconciliation updates an on-chain-disabled weekly claim to disabled.
- [x] `AC-US-PAYROLL-011-04` Reconciliation runs when company data loads.
- [x] `AC-US-PAYROLL-011-05` Reconciliation runs after a successful withdrawal.
- [x] `AC-US-PAYROLL-011-06` Reconciliation runs after a successful disable operation.
- [x] `AC-US-PAYROLL-011-07` Reconciliation runs after a successful enable operation.
- [x] `AC-US-PAYROLL-011-08` Reconciliation reports the numbers of processed, updated, and skipped claims.
- [x] `AC-US-PAYROLL-011-09` Subsequent weekly-claim reads expose the reconciled statuses.

#### Business Rules

- [x] `AC-US-PAYROLL-011-10` A signature bound to a previous Cash Remuneration contract is cleared and its weekly claim returns to pending.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-011-11` A missing or invalid signature skips only the affected weekly claim.
- [x] `AC-US-PAYROLL-011-12` A failed contract read skips only the affected weekly claim.

**Dependencies:** US-PAYROLL-008

## US-PAYROLL-012: Review Payroll History

**As a** company member or owner\
**I want to** review weekly claims and their status\
**So that** I can track recorded work and completed payments

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-012-01` A member can review each weekly claim's status, total duration, token amounts, daily breakdown, goals, and
      attachments.
- [x] `AC-US-PAYROLL-012-02` Company-wide payroll history provides each claim's member, week, duration, rates, computed amounts, status, and
      valid transitions.
- [x] `AC-US-PAYROLL-012-03` A company member can select another current member to review that member's claim history.
- [x] `AC-US-PAYROLL-012-04` _(API)_ Weekly claims can be filtered by status.
- [x] `AC-US-PAYROLL-012-05` _(API)_ Weekly claims can be filtered by member.
- [x] `AC-US-PAYROLL-012-06` _(API)_ Weekly-claim total minutes are derived from their daily claims.

#### Business Rules

- [x] `AC-US-PAYROLL-012-07` Paginated company-wide payroll history returns at most 100 rows per page.
- [x] `AC-US-PAYROLL-012-08` Unpaginated company-wide payroll history uses the `{ data, total }` response shape.
- [x] `AC-US-PAYROLL-012-09` Every authenticated company member can retrieve company-wide payroll records so that compensation remains
      transparent within the company.

#### Edge & Error Cases

- [x] `AC-US-PAYROLL-012-10` An invalid status filter is rejected.
- [x] `AC-US-PAYROLL-012-11` An invalid member-address filter is rejected.
- [x] `AC-US-PAYROLL-012-12` An invalid page filter is rejected.
- [x] `AC-US-PAYROLL-012-13` An invalid limit filter is rejected.

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-013: Review the Payroll Account Position

**As a** company member\
**I want to** inspect the Cash Remuneration account position and activity\
**So that** I can understand payroll liquidity, pending obligations, and account movements

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PAYROLL-013-01` A company member can inspect the Cash Remuneration address, total balance, and token holdings.
- [x] `AC-US-PAYROLL-013-02` The account summary reports the value of signed claims that remain pending for withdrawal.
- [x] `AC-US-PAYROLL-013-03` Account activity lists native deposits, token deposits, and withdrawals with their monetary values.
- [x] `AC-US-PAYROLL-013-04` A company member can filter Cash Remuneration activity by date and transaction type.

#### Business Rules

- [x] `AC-US-PAYROLL-013-05` Inspecting the Payroll account position does not require signing or withdrawal permission.

#### Edge & Error Cases

- [ ] `AC-US-PAYROLL-013-06` The withdrawn-compensation summary includes only claims withdrawn during the current calendar month.

**Dependencies:** US-PAYROLL-003, Accounts

## Known Gaps

Functional gaps map to unchecked acceptance criteria.

### Functional Gaps

- The update and delete APIs allow claims from a disabled week to change even though the functional lifecycle permits changes only while the
  week is pending.
- The legacy enable and disable API actions can update the stored status without performing the matching on-chain action.
- The withdrawn-compensation summary labelled for the current month aggregates every withdrawn claim returned by the API instead of applying
  a current-month boundary (`US-PAYROLL-013`).

## Implementation Evidence

**Implementation evidence reviewed against:** `006685cb46c8408101e785b258482092a1e63f70`

- [Cash Remuneration overview](../../../app/src/components/sections/CashRemunerationView/CashRemunerationOverview.vue),
  [claim history](../../../app/src/components/sections/ClaimHistoryView/ClaimHistory.vue), and
  [weekly-claim actions](../../../app/src/components/sections/WeeklyClaimView/WeeklyClaimActionDropdown.vue)
- [Wage standard step](../../../app/src/components/sections/DashboardView/SetMemberWageStandardStep.vue) and
  [rate-dot presentation](../../../app/src/components/ui/RateDotList.vue)
- [Wage configuration](../../../app/src/components/sections/DashboardView/SetMemberWageModal.vue)
- [Member wage overview](../../../app/src/components/sections/DashboardView/MemberSection.vue)
- [Member claim action alerts](../../../app/src/components/sections/ClaimHistoryView/ClaimHistoryActionAlerts.vue)
- [Wage client query and mutations](../../../app/src/queries/wage.queries.ts)
- [Daily claim form](../../../app/src/components/sections/CashRemunerationView/Form/ClaimForm.vue)
- [Daily claim file upload](../../../app/src/components/sections/CashRemunerationView/Form/UploadFileDB.vue)
- [Claim submission flow](../../../app/src/components/sections/CashRemunerationView/SubmitClaims.vue)
- [Claim editing flow](../../../app/src/components/sections/CashRemunerationView/EditClaims.vue)
- [Claim history daily breakdown](../../../app/src/components/sections/ClaimHistoryView/ClaimHistoryDailyBreakdown.vue)
- [Claim history claim actions](../../../app/src/components/sections/ClaimHistoryView/ClaimActions.vue)
- [Claim history member selector](../../../app/src/components/sections/ClaimHistoryView/ClaimHistoryMemberHeader.vue)
- [Daily claim form rules](../../../app/src/utils/claims/form.ts)
- [Weekly goals](../../../app/src/components/sections/CashRemunerationView/SubmitWeeklyGoals.vue)
- [Claim history](../../../app/src/components/sections/ClaimHistoryView/ClaimHistory.vue)
- [Weekly claim actions](../../../app/src/components/sections/WeeklyClaimView/WeeklyClaimActionDropdown.vue)
- [Signature flow](../../../app/src/components/sections/CashRemunerationView/CRSigne.vue)
- [Withdrawal flow](../../../app/src/components/sections/CashRemunerationView/CRWithdrawClaim.vue)
- [Wage API](../../../backend/src/controllers/wageController.ts)
- [Daily claim API](../../../backend/src/controllers/claimController.ts)
- [Member wage API](../../../backend/src/controllers/teamController.ts)
- [Wage routes](../../../backend/src/routes/wageRoute.ts)
- [Wage request validation](../../../backend/src/validation/schemas/wage.ts)
- [Payroll persistence models](../../../backend/prisma/schema.prisma)
- [Daily claim request validation](../../../backend/src/validation/schemas/claim.ts)
- [Daily claim validation tests](../../../backend/src/validation/__tests__/claim.test.ts)
- [Cash Remuneration ownership boundary](../../../backend/src/utils/cashRemunerationUtil.ts) and
  [week-start calculation](../../../backend/src/utils/dayUtils.ts)
- [Weekly claim API and reconciliation](../../../backend/src/controllers/weeklyClaimController.ts)
- [Cash Remuneration contract](../../../contract/contracts/CashRemunerationEIP712.sol)
- [Bank contract](../../../contract/contracts/Bank.sol)
- [Frontend Payroll tests](../../../app/src/components/sections/CashRemunerationView/__tests__)
- [Wage API tests](../../../backend/src/controllers/__tests__/wageController.test.ts)
- [Claim API tests](../../../backend/src/controllers/__tests__/claimController.test.ts)
- [Weekly claim API tests](../../../backend/src/controllers/__tests__/weeklyClaimController.test.ts)
- [Cash Remuneration contract tests](../../../contract/test/CashRemunerationEIP712.spec.ts)

### Test-suite ownership

- [Payroll member tests](../../../app/src/components/sections/DashboardView/__tests__/MemberSection.spec.ts),
  [wage-modal tests](../../../app/src/components/sections/DashboardView/__tests__/SetMemberWageModal.spec.ts),
  [standard-wage tests](../../../app/src/components/sections/DashboardView/__tests__/SetMemberWageStandardStep.spec.ts),
  [overtime-wage tests](../../../app/src/components/sections/DashboardView/__tests__/SetMemberWageOvertimeStep.spec.ts),
  [weekly-claim query tests](../../../app/src/queries/__tests__/weeklyClaim.queries.spec.ts),
  [weekly-goal query tests](../../../app/src/queries/__tests__/weeklyClaimGoals.queries.spec.ts), and
  [payroll view tests](../../../app/src/views/team/%5Bid%5D/__tests__/CashRemunerationView.spec.ts)
- [Cash-remuneration ownership tests](../../../backend/src/utils/__tests__/cashRemunerationUtil.test.ts),
  [week-boundary tests](../../../backend/src/utils/__tests__/dayUtils.test.ts),
  [wage-resolution tests](../../../backend/src/utils/__tests__/wageResolution.test.ts), and
  [wage-format tests](../../../backend/src/utils/__tests__/wageUtil.test.ts)
- [Cash Remuneration withdrawal tests](../../../contract/test/CashRemunerationEIP712.withdrawSher.spec.ts)

## Related Documentation

- [File Storage implementation](../../implementation/file-storage/README.md)
- [Request Validation implementation](../../implementation/request-validation/README.md)
- [Client Navigation implementation](../../implementation/client-navigation/README.md)
- [Cash Remuneration contract](../../contracts/features/cash-remuneration/README.md)
- [Bank contract](../../contracts/features/bank/README.md)
- [ADR-0001: Use member-week identity for payroll claims](../../adr/0001-member-week-payroll-identity.md)
- [Product Feature Inventory](../README.md)
