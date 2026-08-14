# Expense Account — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-14

These stories describe the Expense Account journey across the portal, API, and on-chain account.
Complete the applicable checklist items to cover the main user journeys and edge cases.

### Lifecycle (test in this order)

1. Configure supported tokens and fund the Expense Account from Bank.
2. Sign a budget approval for a team member and persist its signing context.
3. The approved member spends from the account to a recipient.
4. The system enforces the member, amount, dates, frequency, and signature.
5. Deactivate or reactivate approvals; inspect balances, usage, and history.

### Terminology

- An **approval** is an EIP-712 signature over a BudgetLimit; signing it creates no on-chain
  payment.
- A **spend** pays from the Expense Account balance, not the member wallet. The member needs no
  ERC-20 allowance for the payment.
- The signature is bound to the Expense Account address and chain ID; the portal checks both before
  a spend.
- The **amount** is the maximum spend within an approval period. One-time approvals can be used
  once; daily, weekly, monthly, and custom approvals renew their allowance in a new period.
- Funding Bank → Expense Account is internal cash movement, not an operating expense. The expense is
  recognised when an approved payout occurs; see the
  [accounting catalogue](../accounting/money-flow-catalogue.md).

---

## Status Overview

| User Story | Title                                                | Actor       | Status | Priority | Effort |
| ---------- | ---------------------------------------------------- | ----------- | :----: | :------: | ------ |
| US-EXP-001 | Configure supported ERC-20 tokens                    | Owner       |   ✅   |    P2    | S      |
| US-EXP-002 | Fund the Expense Account and return unused funds     | Owner       |   ✅   |    P1    | M      |
| US-EXP-003 | Grant and store a signed spending approval           | Owner       |   ✅   |    P1    | M      |
| US-EXP-004 | Spend against a valid signed approval                | Member      |   ✅   |    P1    | L      |
| US-EXP-005 | Enforce validity, amount, and period limits          | System      |   ⚠️   |    P1    | M      |
| US-EXP-006 | Deactivate or reactivate an approval                 | Owner       |   ✅   |    P2    | S      |
| US-EXP-007 | View approvals, balances, usage, and payment history | Team member |   ✅   |    P2    | M      |

> _(chain)_ criteria are best verified on a deployed test team or through contract tests. _(API)_
> criteria need a direct API test or the portal’s database-backed flow.

> **Known protection gaps (US-EXP-005).** The current account does not apply a pause guard to
> spends, and its one-time path returns before the ERC-20 support check. Pausing therefore does not
> stop a spend, and a one-time approval can use an ERC-20 outside the support list if that token is
> already held by the Expense Account. These are documented behaviour, not acceptance criteria.

---

## US-EXP-001: Configure Supported ERC-20 Tokens

**As a** team owner **I want to** control supported ERC-20 tokens **so that** recurring budgets and
deposits use configured assets only.

- [ ] _(chain)_ Only the Expense Account owner can add or remove a supported token.
- [ ] _(chain)_ Duplicate, unsupported, and zero-address token changes are rejected.
- [ ] _(chain)_ Token deposits reject unsupported tokens; periodic spends also reject an unsupported
      approval token.

**Priority:** P2 · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-TEAM-001

---

## US-EXP-002: Fund the Expense Account and Return Unused Funds

**As a** team owner **I want to** fund the Expense Account and return unused funds to Bank **so
that** delegated budgets have liquidity without stranding treasury funds.

- [ ] _(chain)_ Any address can send native currency to the account and it records the deposit.
- [ ] _(chain)_ A supported, non-zero ERC-20 deposit requires a prior allowance and records the
      deposit.
- [ ] _(portal)_ A Bank owner can fund the account by transferring native currency or a supported
      ERC-20 to its contract address (see [Bank](../bank/Readme.md)).
- [ ] _(chain)_ The owner can sweep every non-zero native and supported ERC-20 balance to Bank while
      the account is unpaused.
- [ ] _(chain)_ Missing Officer or Bank configuration prevents the sweep; successful sweeps record
      the matching treasury-withdrawal events.

**Priority:** P1 · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-BANK-004, US-BANK-005

---

## US-EXP-003: Grant and Store a Signed Spending Approval

**As a** team owner **I want to** sign a member’s spending approval **so that** they can make an
expense payment without a separate owner transaction each time.

- [ ] _(portal)_ The owner selects member, amount, frequency, date range, and token, then reviews
      the approval before signing.
- [ ] _(portal)_ Only the contract owner can approve a member; the action is disabled for archived
      teams.
- [ ] _(API)_ The approval is signed with the current account address and chain ID.
- [ ] _(API)_ The API accepts the request only from the current on-chain owner and verifies
      recovered signer, signing contract, and chain before persisting it.
- [ ] _(API)_ The saved approval includes signature, member, limits, signing contract, and chain ID.
- [ ] _(portal)_ Success reports approval; signing and persistence errors remain visible.

**Priority:** P1 · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-EXP-001

---

## US-EXP-004: Spend Against a Valid Signed Approval

**As an** approved team member **I want to** pay a recipient from the Expense Account **so that**
the approved expense settles without an owner transaction at payment time.

- [ ] _(portal)_ Personal approvals list only approvals for the connected member; enabled approvals
      expose **Spend**.
- [ ] _(portal)_ The Spend dialog shows the lower of budget remainder and actual account balance.
- [ ] _(portal)_ Loading, failed-balance, and unsupported-token states are explained instead of
      showing an empty payment form.
- [ ] _(portal)_ Before writing, the portal verifies signing contract, network, and recovered signer
      against the current account owner.
- [ ] _(chain)_ A spend requires a non-zero recipient and exactly the member named in the approval.
- [ ] _(chain)_ Native and ERC-20 payouts draw from the account balance, not the member wallet.
- [ ] _(chain)_ Insufficient liquidity, invalid signature, wrong signer, or invalid budget prevents
      payment.
- [ ] _(portal)_ Success closes the modal, reports success, and refreshes approvals; classified
      wallet and contract errors remain visible.

**Priority:** P1 · **Effort:** L · **Status:** ✅ Done · **Dependencies:** US-EXP-002, US-EXP-003

---

## US-EXP-005: Enforce Validity, Amount, and Period Limits

**As a** team owner **I want to** encode limits in my signature **so that** a member cannot exceed
the authority I granted.

- [ ] _(chain)_ Changing any signed BudgetLimit field invalidates its signature.
- [ ] _(chain)_ A payment before the start date or after the end date is rejected.
- [ ] _(chain)_ A payment over the approval amount or remaining period amount is rejected.
- [ ] _(chain)_ A one-time approval cannot be reused after its first payment.
- [ ] _(chain)_ Daily, weekly, monthly, and custom approvals reset usage only after a new period;
      custom frequency must be non-zero.
- [ ] _(API)_ Approval rows synchronise enabled, disabled, expired, and limit-reached states from
      contract usage and current block time.

**Priority:** P1 · **Effort:** M · **Status:** ⚠️ Protection gaps documented above ·
**Dependencies:** US-EXP-003, US-EXP-004

---

## US-EXP-006: Deactivate or Reactivate an Approval

**As a** team owner **I want to** stop or restore an approval **so that** I can respond to a
compromised, obsolete, or temporarily suspended budget.

- [ ] _(portal)_ Only the current contract owner can disable or enable an approval; controls are
      disabled for archived teams.
- [ ] _(chain)_ Deactivation immediately marks the approval signature inactive.
- [ ] _(chain)_ Reactivation marks the same signature active.
- [ ] _(chain)_ A spend using an inactive approval is rejected, including if it was signed before
      deactivation.

**Priority:** P2 · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-EXP-003

---

## US-EXP-007: View Approvals, Balances, Usage, and Payment History

**As a** team member **I want to** inspect the Expense Account and its approvals **so that** I know
what is delegated, spent, available, and historically paid.

- [ ] _(portal)_ The page shows approval statistics, token holdings, contract owner, personal and
      team approvals, and payment history.
- [ ] _(portal)_ Approval rows show member, dates, frequency, token, spent-versus-approved amount,
      and enabled, disabled, or expired status with useful filter, empty, and error states.
- [ ] _(chain)_ Balance and approval-usage reads do not require a transaction.
- [ ] _(portal)_ Payment history groups events from one transaction and supports filters,
      pagination, details, empty state, and query-error feedback.

**Priority:** P2 · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-EXP-002, US-EXP-003,
US-EXP-004

---

## Related Documentation

- [Bank](../bank/Readme.md) — funding the Expense Account and managing the operating treasury.
- [Payroll](../payroll/Readme.md) — the related signed wage-claim feature.
- [Accounting money-flow catalogue](../accounting/money-flow-catalogue.md) — when internal funding
  becomes an operating expense.
