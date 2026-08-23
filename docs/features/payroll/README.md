# Payroll & Cash Remuneration — User Stories

**Scope:** Wage configuration, weekly goals, daily work claims, approval, withdrawal, and payroll history

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).

## Product Model

A wage is an off-chain, versioned record that defines a member's standard and optional overtime rates, weekly allowance, and daily
allowance. A daily claim records work in ten-minute increments. Each team member has at most one weekly claim per ISO week. The first
submitted daily claim binds that weekly claim to the current wage; every later claim for the same week reuses that row and wage, even when
the owner changes the member's current wage. A goals-only weekly row has priced no work yet, so its first daily claim can bind it to the
wage that is current at submission time.

A wage change creates a new current version immediately. Payroll does not schedule wage changes or delay their effective date. Existing
weekly claims keep their stored wage so historical hours, limits, approvals, and payments are not repriced.

Approval is an EIP-712 signature from the current Cash Remuneration contract owner. It does not move funds. The member submits the signed
weekly claim on-chain to receive native tokens and supported ERC-20 assets; SHER compensation is minted when the current contract
configuration supports it.

The team Bank can fund the Cash Remuneration contract through its normal transfer actions. This is not a `transferFrom` operation, and its
complete journey belongs to the Accounts feature.

## Lifecycle

1. The team owner sets a wage for the member.
2. The owner funds the Cash Remuneration contract when non-mintable assets are required.
3. The member optionally sets weekly goals and submits daily claims.
4. The member can edit or delete claims while the week is pending.
5. Once the week is complete, the Cash Remuneration owner signs the weekly claim.
6. The member withdraws the signed claim on-chain.
7. The portal reconciles the stored status with the current contract.

## Status Overview

| User Story     | Title                                      | Actor               | Status         | Priority | Effort |
| -------------- | ------------------------------------------ | ------------------- | -------------- | :------: | ------ |
| US-PAYROLL-001 | Set a member's wage                        | Team owner          | 🚧 In Progress |    P1    | M      |
| US-PAYROLL-002 | Pause or resume a member's wage            | Team owner          | 🧪 Validation  |    P2    | S      |
| US-PAYROLL-003 | Fund the Payroll contract                  | Team owner          | 🔗 Reference   |    P1    | —      |
| US-PAYROLL-004 | Set weekly goals                           | Team member         | 🧪 Validation  |    P3    | S      |
| US-PAYROLL-005 | Submit a daily claim                       | Team member         | 🚧 In Progress |    P1    | M      |
| US-PAYROLL-006 | Edit a daily claim                         | Team member         | 🚧 In Progress |    P2    | S      |
| US-PAYROLL-007 | Delete a daily claim                       | Team member         | 🚧 In Progress |    P2    | S      |
| US-PAYROLL-008 | Sign a completed weekly claim              | Contract owner      | 🚧 In Progress |    P1    | L      |
| US-PAYROLL-009 | Disable or re-enable a signed weekly claim | Contract owner      | 🚧 In Progress |    P2    | M      |
| US-PAYROLL-010 | Withdraw an approved weekly claim          | Paid member         | 🧪 Validation  |    P1    | M      |
| US-PAYROLL-011 | Reconcile weekly claims with the chain     | System              | 🧪 Validation  |    P2    | M      |
| US-PAYROLL-012 | Review payroll history                     | Team member / owner | 🧪 Validation  |    P2    | M      |

Criteria tagged _(API)_ or _(contract)_ describe outcomes that cannot be confirmed from the portal alone.

## US-PAYROLL-001: Set a Member's Wage

**As a** team owner\
**I want to** set a member's hourly rates and hour limits\
**So that** they can submit claims for fair, bounded compensation

### Acceptance Criteria

- [x] The Set Wage action is available to the team owner for every member.
- [x] The modal identifies the member and separates standard wage from optional overtime wage.
- [x] Standard rates support the network-native token, USDC, and SHER; at least one rate must be enabled with a positive value.
- [x] Disabling a rate resets its submitted amount to zero.
- [x] The regular weekly allowance is a whole number from 1 to 40 hours.
- [x] The daily allowance is a whole number from 1 to 24 hours and defaults to 8 hours.
- [x] The form explains that hours beyond the daily allowance cannot be claimed even when the weekly allowance has capacity.
- [x] Overtime configuration requires at least one positive overtime rate and a whole-number allowance from 1 to 20 hours.
- [x] Success closes the modal, reports that the wage was updated, and refreshes the member data.
- [x] The member table shows standard and overtime rates, weekly and daily allowances, and an empty value when no wage exists.
- [x] Editing pre-fills the operative wage and creates a new version instead of overwriting wage history.
- [ ] A new wage version becomes current immediately; the product has no scheduled wage or future effective date
      ([#2522](https://github.com/globe-and-citizen/cnc-portal/issues/2522)).
- [x] The API finds an existing weekly claim by team, member, and ISO week before selecting a wage.
- [x] A weekly claim containing daily claims keeps the wage used for its first submitted hours after the member's current wage changes.
- [x] Further daily claims for that week reuse the existing weekly claim and its rate, daily limit, weekly limit, and overtime rules.
- [x] A goals-only weekly row does not lock its wage; its first daily claim can move it to the member's current wage.
- [ ] _(database)_ At most one weekly claim can exist for a team, member, and ISO week; the current unique constraint still uses wage and
      week ([#2522](https://github.com/globe-and-citizen/cnc-portal/issues/2522)).
- [ ] The portal and API expose no scheduled-wage badge, notice, timer, response field, or cancellation action
      ([#2522](https://github.com/globe-and-citizen/cnc-portal/issues/2522)).
- [x] A disabled wage cannot be replaced until the owner resumes it.
- [x] Archived teams cannot create or replace wages.
- [x] Non-owners cannot set a wage.
- [x] Wages and their version chain are stored off-chain, and the wage endpoint returns the current wage.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🚧 In Progress

**Dependencies:** Companies and Workspace

## US-PAYROLL-002: Pause or Resume a Member's Wage

**As a** team owner\
**I want to** pause a member's wage and resume it later\
**So that** I can freeze payroll activity without deleting wage history

### Acceptance Criteria

- [x] The owner can pause an active wage and resume a paused wage.
- [x] A paused wage blocks new, edited, and deleted daily claims and blocks a replacement wage.
- [x] Resuming the wage restores the normal claim and wage-change actions.
- [x] Non-owners cannot change the wage status.
- [x] A missing, historical, or otherwise non-operative wage cannot be toggled.
- [x] Archived teams cannot pause or resume a wage.

**Priority:** P2 (High) · **Effort:** S · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-003: Fund the Payroll Contract

**As a** team owner\
**I want to** transfer treasury assets to the Cash Remuneration contract\
**So that** members can withdraw compensation paid in non-mintable assets

This is a reference story. The Accounts feature owns the complete Bank transfer journey.

### Acceptance Criteria

- [x] The Bank owner can send native assets with `transfer` and ERC-20 assets with `transferToken` to the Cash Remuneration address.
- [x] The Cash Remuneration contract can receive native assets and supported ERC-20 transfers.
- [x] _(contract)_ A withdrawal in a non-mintable asset fails when the Cash Remuneration contract lacks the required balance.
- [x] _(contract)_ SHER compensation follows the configured Investor minting path instead of requiring a prefunded SHER balance.

**Priority:** P1 (Critical) · **Effort:** — · **Status:** 🔗 Reference

**Dependencies:** Accounts, [Bank contract](../../contracts/features/bank/README.md)

## US-PAYROLL-004: Set Weekly Goals

**As a** team member\
**I want to** record my goals for an ISO week\
**So that** my planned work is visible beside my submitted claims

### Acceptance Criteria

- [x] A member with a wage can submit a free-form Markdown goals memo.
- [x] Goals can create a pending weekly claim before any daily hours are submitted.
- [x] Saving again updates the single goals memo for that member and week.
- [x] A member without an applicable wage cannot create the weekly goals record.
- [x] Goals can be cleared with an empty memo.
- [x] Goals become read-only once the week is signed, withdrawn, or disabled.
- [x] Archived teams cannot create or update weekly goals.

**Priority:** P3 (Medium) · **Effort:** S · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-005: Submit a Daily Claim

**As a** team member\
**I want to** log the work completed on a given day\
**So that** it can be included in my weekly compensation

### Acceptance Criteria

- [x] Submit Claim is available only to the selected member when an applicable wage exists and the selected week accepts new claims.
- [x] The form contains a UTC work date, whole hours, ten-minute increments, a memo, and up to ten attachments.
- [x] Duration is positive, is a multiple of ten minutes, and does not exceed 24 hours or the wage's lower daily allowance.
- [x] The portal and API validate a supplied memo after trimming: it must contain 1 to 3,000 characters, so empty or whitespace-only values
      and a 3,001-character value are rejected.
- [x] Success reports that the claim was added, closes the modal, and refreshes weekly-claim data.
- [x] The portal rejects a single claim above the daily allowance before submission.
- [x] The portal includes existing claims for the selected day when checking the daily allowance and explains the allowance, claimed amount,
      and remainder.
- [x] _(API)_ The weekly total cannot exceed the combined regular and overtime allowances.
- [x] _(API)_ The server enforces the daily allowance and uses an 8-hour fallback for legacy wages.
- [x] When submission restriction is active, the portal and API accept only the current ISO week and at most four days in the past.
- [x] Weeks that already carry a signature are unavailable in the date picker.
- [x] Signed, withdrawn, and disabled weeks reject new claims.
- [x] A paused wage rejects new claims.
- [x] More than ten attachments are rejected by both the portal and API.
- [x] A rejected request keeps the form available and displays the server error.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-006: Edit a Daily Claim

**As a** team member\
**I want to** correct a daily claim\
**So that** mistakes can be fixed before the week is approved

### Acceptance Criteria

- [x] The claim owner can edit the duration, memo, and attachments while the week is pending.
- [x] The work date remains locked during editing.
- [x] The update API permits a partial update without a memo; when a memo is supplied, the portal and API apply the same trimmed
      1-to-3,000-character rule as claim creation.
- [x] The combined existing and new attachment count cannot exceed ten.
- [x] _(API)_ The weekly allowance is rechecked while excluding the claim being edited.
- [x] _(API)_ The daily allowance is rechecked for the original work date while excluding the claim being edited.
- [ ] The edit form includes other claims from the same day in its pre-submit daily-limit feedback; the API currently catches this only
      after submission.
- [x] A user other than the claim owner cannot edit the claim.
- [ ] The API restricts editing to a pending week; it currently also accepts a disabled weekly claim even though the portal hides the
      action.
- [x] A paused wage blocks claim editing.
- [x] Success refreshes the claim data and failure keeps an actionable error in the modal.
- [x] Archived teams cannot edit claims.

**Priority:** P2 (High) · **Effort:** S · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-007: Delete a Daily Claim

**As a** team member\
**I want to** delete a daily claim entered by mistake\
**So that** it is removed before the week is approved

### Acceptance Criteria

- [x] The owner can open a confirmation showing the claim duration and date for a pending claim.
- [x] Confirming deletion reports success and refreshes weekly-claim data.
- [x] Stored attachments belonging to the deleted claim are removed.
- [x] Deleting the final claim removes an otherwise empty weekly claim but preserves a row that still contains weekly goals.
- [x] A user other than the claim owner cannot delete the claim.
- [ ] The API restricts deletion to a pending week; it currently also accepts a disabled weekly claim even though the portal hides the
      action.
- [x] A paused wage blocks claim deletion.
- [x] Archived teams cannot delete claims.
- [x] A failed deletion remains visible as an error rather than success.

**Priority:** P2 (High) · **Effort:** S · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-008: Sign a Completed Weekly Claim

**As a** Cash Remuneration contract owner\
**I want to** sign a member's completed weekly claim\
**So that** the member is authorised to withdraw that week's compensation

### Acceptance Criteria

- [x] The portal exposes the sign action only to the current Cash Remuneration contract owner.
- [ ] The API uses the same signing authority as the portal and contract; it currently also accepts the team owner when that address is not
      the Cash Remuneration owner.
- [x] Signing requests an EIP-712 wallet signature bound to Cash Remuneration version 1, the active contract, and the active chain.
- [x] The portal exposes signing only when the weekly claim contains at least one daily claim.
- [x] _(API)_ The backend rejects signing a goals-only weekly claim before storing a signature or changing its status.
- [x] The current week and future weeks cannot be signed.
- [x] Normal signing applies to pending weeks; a disabled claim uses the explicit re-sign flow.
- [x] Signing is unavailable while the team is archived or has not migrated to the current Officer generation.
- [x] _(API)_ The signed-against contract must match the team's current Cash Remuneration contract, and the recovered signer must match the
      caller.
- [x] A rejected wallet signature is reported without changing the weekly claim.
- [x] A previous-contract signature is reset to pending during reconciliation so the current owner can sign it again against the active
      contract.
- [x] Re-signing a disabled current-contract claim re-enables its existing signature before storing the replacement.

**Priority:** P1 (Critical) · **Effort:** L · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-009: Disable or Re-enable a Signed Weekly Claim

**As a** Cash Remuneration contract owner\
**I want to** disable a signed weekly claim and re-enable it if appropriate\
**So that** I can stop its payout before the member withdraws

### Acceptance Criteria

- [x] The current Cash Remuneration owner can disable a signed claim on-chain.
- [x] The owner can re-enable a disabled claim that has an existing signature.
- [x] Successful contract actions reconcile the stored status and refresh the action menu.
- [x] Withdrawn claims expose no disable or enable action in the portal.
- [x] The action menu exposes only the transition valid for the current signed or disabled state.
- [x] Users who are not the Cash Remuneration owner cannot invoke the contract actions.
- [ ] The legacy weekly-claim update API cannot mark a claim enabled or disabled without the matching on-chain action; it currently accepts
      a team owner and updates only the database.

**Priority:** P2 (High) · **Effort:** M · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-008

## US-PAYROLL-010: Withdraw an Approved Weekly Claim

**As a** paid team member\
**I want to** withdraw my signed weekly claim\
**So that** I receive the approved compensation in my wallet

### Acceptance Criteria

- [x] A signed week exposes Withdraw only to the member named by the claim.
- [x] Withdrawal sends the complete native-token, ERC-20, and mintable-token wage payload on-chain.
- [x] Success reports Claim withdrawn and reconciles the stored status with the contract.
- [x] Withdraw is unavailable after payment and while the team is archived.
- [x] A weekly claim without signed status or without a signature cannot be withdrawn through the product journey.
- [x] _(API)_ A user outside the team, another member, and the team or contract owner cannot mark a member's weekly claim withdrawn on their
      behalf.
- [x] A signature bound to another Cash Remuneration contract or network is rejected before the transaction.
- [x] A signature that no longer recovers the current contract owner is rejected.
- [x] _(contract)_ The caller must match the employee encoded by the signed claim.
- [x] _(contract)_ A paid, disabled, unsupported-token, underfunded, or paused claim reverts.
- [x] Cancelling the wallet transaction produces no success state and no error toast.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-008, US-PAYROLL-003

## US-PAYROLL-011: Reconcile Weekly Claims With the Chain

**As a** system\
**I want to** reconcile signed and disabled weekly claims with the active contract\
**So that** the portal reflects paid, disabled, and stale-signature state

### Acceptance Criteria

- [x] Reconciliation reads every signed or disabled claim and updates paid claims to withdrawn and on-chain-disabled claims to disabled.
- [x] A signature bound to a previous Cash Remuneration contract is cleared and returned to pending.
- [x] Reconciliation runs when team data loads and after successful withdraw, disable, or enable actions.
- [x] A missing or invalid signature and a failed contract read skip only the affected row.
- [x] The result reports processed, updated, and skipped claims and refreshes weekly-claim queries.

**Priority:** P2 (High) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-008

## US-PAYROLL-012: Review Payroll History

**As a** team member or owner\
**I want to** review weekly claims and their status\
**So that** I can track recorded work and completed payments

### Acceptance Criteria

- [x] A member's history shows each week's status, total duration, token amounts, daily breakdown, goals, and attachments.
- [x] The Company Payroll table shows member, week, duration, rates, computed amounts, status, and currently available actions.
- [x] _(API)_ Weekly claims can be filtered by status and member, and total minutes are derived from their daily claims.
- [x] The Company Payroll table requests a paginated slice of at most 100 rows; unpaginated consumers receive the same `{ data, total }`
      response shape.
- [x] Every authenticated team member can retrieve team-wide payroll records so that compensation remains transparent within the team.
- [x] Invalid status, member-address, page, and limit filters are rejected.

**Priority:** P2 (High) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-005

## Known Gaps

- The current implementation still schedules some wage changes with `effectiveFrom`, exposes the scheduled state through the API and portal,
  and enforces weekly-claim uniqueness by wage and week instead of team, member, and week. Tracked by
  [#2522](https://github.com/globe-and-citizen/cnc-portal/issues/2522).
- The edit form does not include the other claims from the same day in its inline daily-limit check; the API still rejects the invalid
  total.
- The update and delete APIs allow claims from a disabled week to change even though the portal exposes those actions only while the week is
  pending.
- The signing API accepts a team owner who is not the current Cash Remuneration owner. Such a signature cannot authorise the later contract
  withdrawal.
- The legacy enable and disable API actions can update the stored status without performing the matching on-chain action.
- The Submit Claim modal says that only one claim can be submitted per week, while the implemented model allows multiple daily claims in the
  same weekly claim.

## Implementation Evidence

- [Payroll navigation and routes](../../../app/src/composables/useSidebarNavItems.ts)
- [Wage configuration](../../../app/src/components/sections/DashboardView/SetMemberWageModal.vue)
- [Member wage overview](../../../app/src/components/sections/DashboardView/MemberSection.vue)
- [Daily claim form](../../../app/src/components/sections/CashRemunerationView/Form/ClaimForm.vue)
- [Daily claim form validation](../../../app/src/composables/useClaimForm.ts)
- [Weekly goals](../../../app/src/components/sections/CashRemunerationView/SubmitWeeklyGoals.vue)
- [Claim history](../../../app/src/components/sections/ClaimHistoryView/ClaimHistory.vue)
- [Weekly claim actions](../../../app/src/components/sections/WeeklyClaimView/WeeklyClaimActionDropdown.vue)
- [Signature flow](../../../app/src/components/sections/CashRemunerationView/CRSigne.vue)
- [Withdrawal flow](../../../app/src/components/sections/CashRemunerationView/CRWithdrawClaim.vue)
- [Wage API](../../../backend/src/controllers/wageController.ts)
- [Daily claim API](../../../backend/src/controllers/claimController.ts)
- [Daily claim request validation](../../../backend/src/validation/schemas/claim.ts)
- [Daily claim validation tests](../../../backend/src/validation/__tests__/claim.test.ts)
- [Weekly claim API and reconciliation](../../../backend/src/controllers/weeklyClaimController.ts)
- [Cash Remuneration contract](../../../contract/contracts/CashRemunerationEIP712.sol)
- [Bank contract](../../../contract/contracts/Bank.sol)
- [Frontend Payroll tests](../../../app/src/components/sections/CashRemunerationView/__tests__)
- [Wage API tests](../../../backend/src/controllers/__tests__/wageController.test.ts)
- [Claim API tests](../../../backend/src/controllers/__tests__/claimController.test.ts)
- [Weekly claim API tests](../../../backend/src/controllers/__tests__/weeklyClaimController.test.ts)
- [Cash Remuneration contract tests](../../../contract/test/CashRemunerationEIP712.spec.ts)

## Related Documentation

- [Cash Remuneration contract](../../contracts/features/cash-remuneration/README.md)
- [Bank contract](../../contracts/features/bank/README.md)
- [Product Feature Inventory](../README.md)
