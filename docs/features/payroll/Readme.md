# Payroll & Cash Remuneration — User Stories

**Format:** User Story | Acceptance Criteria | Priority (P1–P5) | Effort (XS/S/M/L/XL)
**Last updated:** 2026-08-11

Payroll lets a team admin set hourly wages for members, fund the treasury, and
approve time-based claims that members withdraw on-chain.

The **daily hour cap** is not a story of its own — it is a constraint that only
touches two existing stories: it is _configured_ when setting a wage
(US-PAYROLL-001) and _enforced_ when submitting or editing a claim
(US-PAYROLL-003). It is captured as acceptance criteria under those stories, not
as a standalone feature.

---

## Status Overview

| User Story    | Title                         | Status | Priority | Effort |
| ------------- | ----------------------------- | :----: | :------: | ------ |
| US-PAYROLL-001 | Set member wage              |   ✅   |    P1    | M      |
| US-PAYROLL-002 | Deposit funds to bank account |   ✅   |    P1    | M      |
| US-PAYROLL-003 | Submit weekly claim          |   ✅   |    P1    | M      |
| US-PAYROLL-004 | Approve weekly claims        |   ✅   |    P1    | L      |
| US-PAYROLL-005 | Withdraw payment             |   ✅   |    P1    | M      |
| US-PAYROLL-006 | View payment history         |   🔄   |    P2    | M      |

> **Daily cap** is folded into US-PAYROLL-001 (configure) and US-PAYROLL-003
> (enforce). See the 🕐 criteria in those two stories.

---

## US-PAYROLL-001: Set Member Wage

**As a** team admin
**I want to** set wage rates and hour limits for each team member
**So that** they can submit claims for fair compensation within agreed limits

**Acceptance Criteria:**

- [ ] Wage form shows member name and address
- [ ] Can set rates in multiple currencies: native token, USDC, SHER
- [ ] Each rate is a per-hour amount
- [ ] Can set a maximum number of hours per week (up to 40 regular + up to 20 overtime)
- [ ] 🕐 Can set a maximum number of hours **per day** — a whole number from 1 to
      24; when left empty it defaults to **8**, so every wage always carries a
      daily cap
- [ ] 🕐 A hint explains the effect: "Hours beyond N hrs/day won't be claimable,
      even if the weekly cap hasn't been reached"
- [ ] 🕐 The saved caps appear in the Team Members table: the weekly cap as
      "40h/wk" and the daily cap as an amber badge "8h/d" with a "Daily limit: N
      hours" tooltip (badge hidden only on legacy wages that never got a value)
- [ ] Save button disabled until all required fields are filled
- [ ] Wage stored and returned on every wage response
- [ ] Success toast: "Wage set for [Member Name]"
- [ ] Admin can edit/update wages — including the daily cap — for existing members

**Priority:** P1 (Critical)
**Effort:** M (5 points)
**Status:** ✅ Done
**Dependencies:** US-TEAM-001

---

## US-PAYROLL-002: Deposit Funds to Bank Account

**As a** team admin
**I want to** deposit funds (USDC, native token) into the team bank account
**So that** the team has funds available for paying claims

**Acceptance Criteria:**

- [ ] Bank account address displayed
- [ ] Deposit amount input field
- [ ] Currency selector (USDC, native token)
- [ ] Confirm button shows transaction details
- [ ] User signs transaction in wallet
- [ ] Transaction submitted to blockchain
- [ ] Balance updated when transaction is confirmed
- [ ] Success notification with transaction hash

**Priority:** P1 (Critical)
**Effort:** M (5 points)
**Status:** ✅ Done
**Dependencies:** US-PAYROLL-001, US-TEAM-001

---

## US-PAYROLL-003: Submit Weekly Claim

**As a** team member
**I want to** submit work claims for the past week
**So that** I can request compensation for my work

**Acceptance Criteria:**

- [ ] Claim form shows: week start date, hours worked per day, memo
- [ ] Maximum 24 hours can be submitted per claim
- [ ] Daily breakdown shown with an hours input for each day
- [ ] Hours cannot exceed the member's weekly wage maximum (regular + overtime)
- [ ] 🕐 A claim cannot push a single day's total above the member's daily cap;
      the check counts the hours already claimed for that same day
- [ ] 🕐 The daily cap is enforced **server-side** on both submit and edit — an
      over-cap claim is rejected (HTTP 409) with a breakdown (allowance / already
      submitted that day / remaining), falling back to 8h for wages with no
      explicit cap so legacy claims are still capped
- [ ] 🕐 The claim form mirrors the rule for immediate feedback: an inline error on
      "Hours worked" ("Cannot exceed N hours" / "Daily limit would be exceeded…")
      before the request is sent
- [ ] Submit button calculates total hours
- [ ] Error if > 24 hours: "Max 24 hours per submission"
- [ ] Error if > weekly maximum: shows the weekly allowance / submitted / remaining
- [ ] On submit: claim created with "pending" status
- [ ] Confirmation: "Claim submitted for approval"

**Priority:** P1 (Critical)
**Effort:** M (5 points)
**Status:** ✅ Done
**Dependencies:** US-PAYROLL-001

> **🕐 Daily-cap notes (verified against the code):**
>
> - The **server is the authority**. The in-form check is early feedback only.
> - Two known client/server gaps, both safe because the server still enforces the
>   cap: (1) the **edit** form applies the raw cap but not the "already claimed
>   that day" breakdown (that day's claim list isn't threaded into it); (2) when a
>   wage has no explicit cap, the form falls back to a **24h** ceiling while the
>   server enforces **8h**.

---

## US-PAYROLL-004: Approve Weekly Claims

**As a** team admin
**I want to** review and approve member claims
**So that** I can process accurate compensation payments

**Acceptance Criteria:**

- [ ] Admin claims approval page lists all pending claims
- [ ] Claim shows: member name, hours, amounts by currency
- [ ] Admin can view claim details (daily breakdown, memo)
- [ ] Approve button: transfers funds to member, marks as approved
- [ ] Reject button: resets claim to draft, allows member to edit
- [ ] Admin can bulk-approve multiple claims
- [ ] Audit log records who approved which claim and when
- [ ] Confirmation: "X claims approved, Y transferred"

**Priority:** P1 (Critical)
**Effort:** L (8 points)
**Status:** ✅ Done
**Dependencies:** US-PAYROLL-003

---

## US-PAYROLL-005: Withdraw Payment

**As a** team member
**I want to** withdraw my approved claims
**So that** I receive my compensation in my wallet

**Acceptance Criteria:**

- [ ] Member payments page shows: approved claim amount by currency
- [ ] Withdraw button enabled only for approved claims
- [ ] Clicking withdraw shows a transaction confirmation
- [ ] User signs the withdrawal transaction
- [ ] Funds transfer to the member wallet
- [ ] Claim marked as withdrawn
- [ ] Transaction hash displayed
- [ ] Confirmation: "Payment withdrawn to your wallet"

**Priority:** P1 (Critical)
**Effort:** M (5 points)
**Status:** ✅ Done
**Dependencies:** US-PAYROLL-004

---

## US-PAYROLL-006: View Payment History

**As a** team member
**I want to** see my complete payment history
**So that** I can verify all compensation received

**Acceptance Criteria:**

- [ ] History page shows: claim date, hours, amounts by currency, status
- [ ] Filter by date range
- [ ] Sort by claim date, amount, status
- [ ] Export to CSV option
- [ ] Total earned YTD displayed
- [ ] Search by week/month

**Priority:** P2 (High)
**Effort:** M (5 points)
**Status:** 🔄 In Progress
**Dependencies:** US-PAYROLL-005

---

## How to Use These User Stories

1. **For Development:** Pick a user story, read the acceptance criteria, build the feature
2. **For QA:** Use the acceptance criteria as test cases
3. **For Product:** Prioritise by importance (P1 > P2 > P3) and sequencing
4. **For Planning:** Use the effort estimates to plan sprints

---

_[← Back to Cash Remuneration contract](../contracts/cash-remuneration/README.md)_
