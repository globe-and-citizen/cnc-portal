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

When historical data contains more than one weekly claim for the same team member and ISO week, the database migration stops before it
changes the uniqueness rule. The affected claims, goals, signatures, and terminal states must be reconciled explicitly; no payroll data is
silently merged or discarded.

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
| US-PAYROLL-001 | Set a member's wage                        | Team owner          | 🧪 Validation  |    P1    | M      |
| US-PAYROLL-002 | Pause or resume a member's wage            | Team owner          | 🧪 Validation  |    P2    | S      |
| US-PAYROLL-003 | Fund the Payroll contract                  | Team owner          | 🔗 Reference   |    P1    | —      |
| US-PAYROLL-004 | Set weekly goals                           | Team member         | 🧪 Validation  |    P3    | S      |
| US-PAYROLL-005 | Submit a daily claim                       | Team member         | 🧪 Validation  |    P1    | M      |
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

#### Happy Path

- [x] A team owner can set a wage for any team member.
- [x] A successful wage request persists a new version that subsequent member-wage reads return.
- [x] Member-wage reads expose the standard rates, overtime rates, weekly allowance, and daily allowance.

#### Business Rules

- [x] A wage belongs to one member and stores standard rates separately from optional overtime rates.
- [x] Standard rates support the network-native token, USDC, and SHER.
- [x] At least one standard token rate must be enabled with a positive value.
- [x] A disabled token rate is submitted as zero.
- [x] The regular weekly allowance is a whole number from 1 to 40 hours.
- [x] The daily allowance is a whole number from 1 to 24 hours.
- [x] The daily allowance defaults to 8 hours.
- [x] The daily allowance remains a per-day cap even when the weekly allowance still has unused capacity.
- [x] Overtime configuration requires at least one positive overtime rate.
- [x] The overtime allowance is a whole number from 1 to 20 hours.
- [x] A replacement wage references the operative wage as its predecessor without overwriting version history.
- [x] A new wage version becomes current immediately without a future activation option.
- [x] A weekly claim containing daily claims retains its initial wage for the pricing and validation of all later claims in that ISO week.
- [x] The first daily claim in a goals-only weekly row uses the member's current wage.
- [x] _(database)_ At most one weekly claim can exist for each team, member, and ISO week.
- [x] _(migration)_ Legacy duplicate member-week records stop the migration for explicit reconciliation instead of losing claims, goals,
      signatures, or terminal states.
- [x] The wage lifecycle has no cancellation operation.
- [x] Only team owners can set wages.
- [x] Every wage version is stored off-chain.
- [x] The wage endpoint returns the current wage.

#### Edge & Error Cases

- [x] Member-wage reads distinguish members who do not have a wage.
- [x] A disabled wage cannot be replaced until the owner resumes it.
- [x] Archived teams cannot create wages.
- [x] Archived teams cannot replace wages.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** Companies and Workspace

## US-PAYROLL-002: Pause or Resume a Member's Wage

**As a** team owner\
**I want to** pause a member's wage and resume it later\
**So that** I can freeze payroll activity without deleting wage history

### Acceptance Criteria

#### Happy Path

- [x] The owner can pause an active wage.
- [x] The owner can resume a paused wage.
- [x] Resuming a wage restores daily-claim actions.
- [x] Resuming a wage permits the owner to replace it.

#### Business Rules

- [x] A paused wage blocks new daily claims.
- [x] A paused wage blocks daily-claim edits.
- [x] A paused wage blocks daily-claim deletion.
- [x] A paused wage blocks replacement wages.
- [x] Non-owners cannot change the wage status.

#### Edge & Error Cases

- [x] The status of a missing wage cannot be changed.
- [x] The status of a historical wage cannot be changed.
- [x] The wage status of an archived team cannot be changed.

**Priority:** P2 (High) · **Effort:** S · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-003: Fund the Payroll Contract

**As a** team owner\
**I want to** transfer treasury assets to the Cash Remuneration contract\
**So that** members can withdraw compensation paid in non-mintable assets

This is a reference story. The Accounts feature owns the complete Bank transfer journey.

### Acceptance Criteria

#### Happy Path

- [x] The Bank owner can send native assets to the Cash Remuneration address.
- [x] The Bank owner can send supported ERC-20 assets to the Cash Remuneration address.
- [x] The Cash Remuneration contract can receive native assets.
- [x] The Cash Remuneration contract can receive supported ERC-20 assets.

#### Business Rules

- [x] _(contract)_ SHER compensation follows the configured Investor minting path instead of requiring a prefunded SHER balance.

#### Edge & Error Cases

- [x] _(contract)_ A withdrawal in a non-mintable asset fails when the Cash Remuneration contract lacks the required balance.

**Priority:** P1 (Critical) · **Effort:** — · **Status:** 🔗 Reference

**Dependencies:** Accounts, [Bank contract](../../contracts/features/bank/README.md)

## US-PAYROLL-004: Set Weekly Goals

**As a** team member\
**I want to** record my goals for an ISO week\
**So that** my planned work is visible beside my submitted claims

### Acceptance Criteria

#### Happy Path

- [x] A member with a wage can submit a free-form Markdown goals memo.
- [x] Goals can create a pending weekly claim before any daily hours are submitted.
- [x] Saving again updates the single goals memo for that member and week.
- [x] Goals can be cleared with an empty memo.

#### Business Rules

- [x] Each member and ISO week has at most one goals memo.

#### Edge & Error Cases

- [x] A member without an applicable wage cannot create a weekly goals record.
- [x] Goals are read-only once the week is signed.
- [x] Goals are read-only once the week is withdrawn.
- [x] Goals are read-only once the week is disabled.
- [x] Archived teams cannot create weekly goals.
- [x] Archived teams cannot update weekly goals.

**Priority:** P3 (Medium) · **Effort:** S · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-005: Submit a Daily Claim

**As a** team member\
**I want to** log the work completed on a given day\
**So that** it can be included in my weekly compensation

### Acceptance Criteria

#### Happy Path

- [x] A member can submit a daily claim for themselves.
- [x] A successful submission persists the daily claim and exposes it through subsequent weekly-claim reads.

#### Business Rules

- [x] A daily claim stores its work date in UTC.
- [x] A daily-claim duration must be greater than 0.
- [x] A daily-claim duration must use ten-minute increments.
- [x] A daily-claim duration cannot exceed 24 hours.
- [x] A daily-claim duration cannot exceed the wage's lower daily allowance.
- [x] A daily-claim memo must contain 1 to 3,000 characters after trimming.
- [x] A daily claim can contain at most ten attachments.
- [x] Daily-allowance validation adds the new duration to the existing claims for the selected work date.
- [x] _(API)_ The weekly total cannot exceed the combined regular and overtime allowances.
- [x] _(API)_ The server enforces the daily allowance with an 8-hour fallback for legacy wages.
- [x] When submission restriction is active, the portal accepts claims only for the current ISO week.
- [x] _(API)_ When submission restriction is active, the API accepts claims only for the current ISO week.
- [x] When submission restriction is active, the portal accepts work dates at most four days in the past.
- [x] _(API)_ When submission restriction is active, the API accepts work dates at most four days in the past.

#### Edge & Error Cases

- [x] A daily claim submitted for another member is rejected.
- [x] A daily claim submitted without an applicable wage is rejected.
- [x] A signed week or a week that already carries a signature rejects new daily claims.
- [x] A withdrawn week rejects new daily claims.
- [x] A disabled week rejects new daily claims.
- [x] A paused wage rejects new claims.
- [x] A rejected submission leaves the daily-claim state unchanged and returns its rejection reason.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-001

## US-PAYROLL-006: Edit a Daily Claim

**As a** team member\
**I want to** correct a daily claim\
**So that** mistakes can be fixed before the week is approved

### Acceptance Criteria

#### Happy Path

- [x] The claim owner can edit the duration, memo, and attachments while the week is pending.
- [x] A successful edit persists the new claim values.

#### Business Rules

- [x] Editing cannot change the claim's original work date.
- [x] The update API permits a partial update without a memo.
- [x] A supplied memo must contain 1 to 3,000 characters after trimming.
- [x] The combined existing and new attachment count cannot exceed ten.
- [x] _(API)_ The weekly allowance is rechecked while excluding the claim being edited.
- [x] _(API)_ The daily allowance is rechecked for the original work date while excluding the claim being edited.
- [x] A user other than the claim owner cannot edit the claim.
- [ ] The API rejects claim edits when the weekly claim is disabled.

#### Edge & Error Cases

- [x] A paused wage blocks claim editing.
- [x] A rejected edit leaves the stored claim unchanged and returns its rejection reason.
- [x] Archived teams cannot edit claims.

**Priority:** P2 (High) · **Effort:** S · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-007: Delete a Daily Claim

**As a** team member\
**I want to** delete a daily claim entered by mistake\
**So that** it is removed before the week is approved

### Acceptance Criteria

#### Happy Path

- [x] A confirmed deletion removes the claim and its stored attachments from subsequent weekly-claim reads.

#### Business Rules

- [x] Deleting a daily claim requires its owner's confirmation before stored data changes.
- [x] Deleting the final daily claim removes an otherwise empty weekly claim but preserves one that still contains goals.
- [x] A user other than the claim owner cannot delete the claim.
- [ ] The API rejects claim deletion when the weekly claim is disabled.

#### Edge & Error Cases

- [x] A paused wage blocks claim deletion.
- [x] Archived teams cannot delete claims.
- [x] A failed deletion leaves the stored claim unchanged and returns a failure outcome.

**Priority:** P2 (High) · **Effort:** S · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-008: Sign a Completed Weekly Claim

**As a** Cash Remuneration contract owner\
**I want to** sign a member's completed weekly claim\
**So that** the member is authorised to withdraw that week's compensation

### Acceptance Criteria

#### Happy Path

- [x] Only the current Cash Remuneration contract owner can initiate signing through the product journey.
- [x] Signing requests an EIP-712 wallet signature bound to Cash Remuneration version 1, the active contract, and the active chain.

#### Business Rules

- [ ] The API authorizes only the current Cash Remuneration contract owner.
- [x] The product journey permits signing only when the weekly claim contains at least one daily claim.
- [x] _(API)_ The backend rejects signing a goals-only weekly claim before storing a signature or changing its status.
- [x] Normal signing applies only to pending weeks.
- [x] A disabled claim uses the explicit re-sign flow.
- [x] Re-signing a disabled current-contract claim re-enables its existing signature before storing the replacement.
- [x] _(API)_ The signed-against contract must match the team's current Cash Remuneration contract.
- [x] _(API)_ The recovered signer must match the caller.

#### Edge & Error Cases

- [x] The current week cannot be signed.
- [x] A future week cannot be signed.
- [x] Archived teams cannot sign weekly claims.
- [x] Teams that have not migrated to the current Officer generation cannot sign weekly claims.
- [x] Rejecting the wallet signature leaves the weekly claim's stored status and signature unchanged.
- [x] Reconciliation clears a previous-contract signature and returns its weekly claim to pending.

**Priority:** P1 (Critical) · **Effort:** L · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-005

## US-PAYROLL-009: Disable or Re-enable a Signed Weekly Claim

**As a** Cash Remuneration contract owner\
**I want to** disable a signed weekly claim and re-enable it if appropriate\
**So that** I can stop its payout before the member withdraws

### Acceptance Criteria

#### Happy Path

- [x] The current Cash Remuneration owner can disable a signed claim on-chain.
- [x] The owner can re-enable a disabled claim that has an existing signature.
- [x] A successful on-chain disable operation reconciles the stored weekly claim to disabled.
- [x] A successful on-chain enable operation reconciles the stored weekly claim to signed.

#### Business Rules

- [x] Users who are not the Cash Remuneration owner cannot invoke the contract actions.
- [ ] The legacy weekly-claim update API does not change stored status without the matching on-chain action.

#### Edge & Error Cases

- [x] A withdrawn claim cannot transition to disabled.
- [x] A withdrawn claim cannot transition to enabled.

**Priority:** P2 (High) · **Effort:** M · **Status:** 🚧 In Progress

**Dependencies:** US-PAYROLL-008

## US-PAYROLL-010: Withdraw an Approved Weekly Claim

**As a** paid team member\
**I want to** withdraw my signed weekly claim\
**So that** I receive the approved compensation in my wallet

### Acceptance Criteria

#### Happy Path

- [x] Only the member named by a signed weekly claim can initiate its withdrawal.
- [x] Withdrawal sends the complete native-token, ERC-20, and mintable-token wage payload on-chain.
- [x] A successful withdrawal transfers the approved compensation.
- [x] A successful withdrawal reconciles the stored status with the contract.

#### Business Rules

- [x] _(API)_ Only the member named by the weekly claim can mark it as withdrawn.
- [x] A signature bound to another Cash Remuneration contract or network is rejected before the transaction.
- [x] A signature that no longer recovers the current contract owner is rejected.
- [x] _(contract)_ The caller must match the employee encoded by the signed claim.
- [x] Product withdrawal requires both signed status and a stored signature.

#### Edge & Error Cases

- [x] A paid claim cannot be withdrawn.
- [x] A claim belonging to an archived team cannot be withdrawn.
- [x] _(contract)_ A paid claim reverts.
- [x] _(contract)_ A disabled claim reverts.
- [x] _(contract)_ A claim with an unsupported token reverts.
- [x] _(contract)_ A claim reverts when the Cash Remuneration contract lacks the required balance.
- [x] _(contract)_ A withdrawal reverts while the Cash Remuneration contract is paused.
- [x] Cancelling the wallet transaction leaves the claim unpaid and its stored status unchanged.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-008, US-PAYROLL-003

## US-PAYROLL-011: Reconcile Weekly Claims With the Chain

**As a** system\
**I want to** reconcile signed and disabled weekly claims with the active contract\
**So that** the portal reflects paid, disabled, and stale-signature state

### Acceptance Criteria

#### Happy Path

- [x] Reconciliation evaluates every signed or disabled weekly claim.
- [x] Reconciliation updates a paid weekly claim to withdrawn.
- [x] Reconciliation updates an on-chain-disabled weekly claim to disabled.
- [x] Reconciliation runs when team data loads.
- [x] Reconciliation runs after a successful withdrawal.
- [x] Reconciliation runs after a successful disable operation.
- [x] Reconciliation runs after a successful enable operation.
- [x] Reconciliation reports the numbers of processed, updated, and skipped claims.
- [x] Subsequent weekly-claim reads expose the reconciled statuses.

#### Business Rules

- [x] A signature bound to a previous Cash Remuneration contract is cleared and its weekly claim returns to pending.

#### Edge & Error Cases

- [x] A missing or invalid signature skips only the affected weekly claim.
- [x] A failed contract read skips only the affected weekly claim.

**Priority:** P2 (High) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-008

## US-PAYROLL-012: Review Payroll History

**As a** team member or owner\
**I want to** review weekly claims and their status\
**So that** I can track recorded work and completed payments

### Acceptance Criteria

#### Happy Path

- [x] A member can review each weekly claim's status, total duration, token amounts, daily breakdown, goals, and attachments.
- [x] Team-wide payroll history provides each claim's member, week, duration, rates, computed amounts, status, and valid transitions.
- [x] _(API)_ Weekly claims can be filtered by status.
- [x] _(API)_ Weekly claims can be filtered by member.
- [x] _(API)_ Weekly-claim total minutes are derived from their daily claims.

#### Business Rules

- [x] Paginated team-wide payroll history returns at most 100 rows per page.
- [x] Unpaginated team-wide payroll history uses the `{ data, total }` response shape.
- [x] Every authenticated team member can retrieve team-wide payroll records so that compensation remains transparent within the team.

#### Edge & Error Cases

- [x] An invalid status filter is rejected.
- [x] An invalid member-address filter is rejected.
- [x] An invalid page filter is rejected.
- [x] An invalid limit filter is rejected.

**Priority:** P2 (High) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-PAYROLL-005

## Known Gaps

Functional gaps map to unchecked acceptance criteria. UI/UX notes remain visible separately but do not define the functional completion
status of a user story.

### Functional Gaps

- The update and delete APIs allow claims from a disabled week to change even though the functional lifecycle permits changes only while the
  week is pending.
- The legacy enable and disable API actions can update the stored status without performing the matching on-chain action.

### UI/UX Notes

- The Submit Claim copy says that only one claim can be submitted per week, while the implemented model allows multiple daily claims in the
  same weekly claim.

## Implementation Evidence

The claim-submission and claim-history journeys remain unchanged; their current implementation evidence was reviewed with this update.

- [Payroll navigation and routes](../../../app/src/composables/useSidebarNavItems.ts)
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
- [Daily claim form rules](../../../app/src/utils/claimFormUtil.ts)
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
- [ADR-0001: Use member-week identity for payroll claims](../../adr/0001-member-week-payroll-identity.md)
- [Product Feature Inventory](../README.md)
