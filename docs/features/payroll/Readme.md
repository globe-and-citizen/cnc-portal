# Payroll & Cash Remuneration — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-12

These stories describe the **whole payroll feature** as it is actually built. The acceptance
criteria are written as a **testing checklist**: once every box in every story is ticked, all use
cases and edge cases of payroll are covered.

### Lifecycle (test in this order)

1. Owner **sets a wage** for the member (rates + weekly cap + daily cap, optional overtime).
2. Payroll contract is **funded** (via the Bank — see US-PAYROLL-003).
3. Member optionally sets **weekly goals**, then **submits daily claims** for a week.
4. Member can **edit / delete** their claims while the week is still pending.
5. Once the week is over, the owner **approves (signs)** the weekly claim (EIP-712).
6. The member **withdraws** the signed claim on-chain; status **syncs** to withdrawn.
7. Owner can **disable / re-enable** a wage or a signed weekly claim at any point.

### Terminology (corrections vs. earlier drafts)

- **"Approve" = an EIP-712 signature** by the CashRemuneration contract owner. There is no separate
  approve-and-transfer step; funds move only at withdrawal.
- **A wage is stored off-chain** (backend database), not on-chain.
- **Funding is done through the Bank `transferFrom`**, not a standalone "deposit" screen
  (US-PAYROLL-003).

---

## Status Overview

| User Story     | Title                                         | Actor        | Status | Priority | Effort |
| -------------- | --------------------------------------------- | ------------ | :----: | :------: | ------ |
| US-PAYROLL-001 | Set a member's wage                           | Owner        |   ✅   |    P1    | M      |
| US-PAYROLL-002 | Disable / re-enable a member's wage           | Owner        |   ✅   |    P2    | S      |
| US-PAYROLL-003 | Fund the payroll contract (Bank transferFrom) | Owner        |   🔗   |    P1    | —      |
| US-PAYROLL-004 | Set weekly goals                              | Member       |   ✅   |    P3    | S      |
| US-PAYROLL-005 | Submit a daily claim                          | Member       |   ✅   |    P1    | M      |
| US-PAYROLL-006 | Edit a daily claim                            | Member       |   ✅   |    P2    | S      |
| US-PAYROLL-007 | Delete a daily claim                          | Member       |   ✅   |    P2    | S      |
| US-PAYROLL-008 | Approve (sign) a weekly claim                 | Owner        |   ✅   |    P1    | L      |
| US-PAYROLL-009 | Disable / re-enable a signed weekly claim     | Owner        |   ✅   |    P2    | M      |
| US-PAYROLL-010 | Withdraw an approved weekly claim             | Member       |   ✅   |    P1    | M      |
| US-PAYROLL-011 | Sync weekly-claim status with the chain       | System       |   ✅   |    P2    | M      |
| US-PAYROLL-012 | View claim history & payroll overview         | Member/Owner |   ✅   |    P2    | M      |

> **Daily hour cap** is not a story of its own — it is exercised inside US-PAYROLL-001 (configure)
> and US-PAYROLL-005 / US-PAYROLL-006 (enforce). Criteria that touch it are tagged _(daily cap)_.

> Criteria tagged _(API)_ describe a server response a UI tester cannot observe from the screen.
> Verify them with a direct API call — e.g. a request added to the Bruno collection in
> `backend/bruno/CNCPortal` — rather than through the portal.

---

## US-PAYROLL-001: Set a Member's Wage

**As a** team owner **I want to** set a member's hourly rates and hour limits **So that** they can
submit claims for fair, bounded compensation

**Acceptance Criteria:**

- [ ] The "Set Wage" button is shown to the team owner on each member row
- [ ] The modal is titled "Set Wage for {member name}", with step 1 "Standard wage" and an optional
      step 2 "Overtime wage"
- [ ] Standard rates can be set for native token, USDC and SHER, each with an on/off switch; at
      least one rate must be enabled (else "Enable at least one rate")
- [ ] Turning a rate off forces its amount to 0
- [ ] "Weekly cap (hrs)" accepts a whole number 1–40 (over 40 → "Maximum regular hours per week
      cannot exceed 40 hours")
- [ ] _(daily cap)_ "Daily cap (hrs)" accepts a whole number 1–24; left empty it defaults to **8**;
      over 24 is rejected
- [ ] _(daily cap)_ A hint reads "Hours beyond N hrs/day won't be claimable, even if the weekly cap
      hasn't been reached"
- [ ] Enabling "Add overtime rates" reveals step 2: overtime rates plus a "max overtime hours" value
      1–20 (required when overtime is enabled; over 20 rejected)
- [ ] Saving shows the toast "Wage updated successfully" and the wage appears in the Team Members
      table
- [ ] _(daily cap)_ The table shows the weekly cap as "40h/wk" and the daily cap as an amber badge
      "8h/d" (tooltip "Daily limit: N hours"); the cell shows "—" when the member has no wage
- [ ] Editing a member with an existing wage pre-fills the current values; saving creates a new wage
      **version** (one active wage per member)
- [ ] _(scheduling)_ Changing a wage for a member who has **already submitted** something this week
      (hours or goals) takes effect at the **start of the next ISO week**: that week is already
      priced by the wage it was opened with and keeps it
- [ ] _(scheduling)_ Changing a wage for a member who has **submitted nothing** this week applies
      **immediately, to the whole week** — including the days they have already worked but not yet
      submitted. Waiting for them to submit is how the owner avoids that
- [ ] _(scheduling)_ The modal says which of the two is about to happen, before saving ("This change
      takes effect immediately, for the whole current week." / "This change takes effect on Aug 17,
      2026.")
- [ ] _(scheduling)_ The member row shows a badge for a change that waits ("Changes to SHER 10/h,
      15h/wk, 8h/d on Aug 17, 2026"); it disappears once the change takes effect, without a page
      reload
- [ ] _(scheduling)_ Saving again before the effective date **rewrites** the pending change and does
      **not** push its date back; the chain gains no extra version
- [ ] _(scheduling)_ A pending change can be cancelled, leaving the current wage in force
      (`DELETE /wage/scheduled`)
- [ ] _(scheduling)_ A week that is already open never gains a second `WeeklyClaim`: a claim finds
      its week by member and week, so hour caps keep counting on the same row

> Full behaviour, edge cases and API shapes: [Wage scheduling](./wage-scheduling.md).

- [ ] "Set Wage" is disabled with a tooltip when the current wage is disabled ("Resume this wage
      before making changes") — also blocked server-side (400 "Cannot set wage: the current wage is
      disabled")
- [ ] "Set Wage" is disabled when the team is archived (tooltip)
- [ ] Only the team owner can set a wage (non-owners have no button / are rejected 403)
- [ ] The wage is stored **off-chain** (database) and returned on every wage response

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-TEAM-001

---

## US-PAYROLL-002: Disable / Re-enable a Member's Wage

**As a** team owner **I want to** temporarily disable a member's wage and re-enable it later **So
that** I can freeze a member's payroll without deleting their wage history

**Acceptance Criteria:**

- [ ] The owner can disable an active wage and re-enable it
- [ ] While disabled, the member **cannot submit, edit or delete claims** and the owner cannot set a
      new wage ("Resume this wage before making changes")
- [ ] Re-enabling restores normal submit/edit/delete behaviour
- [ ] Only the team owner can toggle a wage (403 "Caller is not the owner of the team")
- [ ] Toggling a wage that does not exist / is not the current version → 404 "Wage not found"

**Priority:** P2 (High) · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-001

---

## US-PAYROLL-003: Fund the Payroll Contract (Bank `transferFrom`)

**As a** team owner **I want to** move team funds into the CashRemuneration contract **So that**
members have balances to withdraw against

> **🔗 Reference story — not fully documented here.** The earlier "Deposit Funds" model was
> incorrect. Payroll is funded by transferring funds into the CashRemuneration contract via the
> **Bank contract's `transferFrom`**. The detailed acceptance criteria live with the Bank feature
> and will be linked from here. Placeholder checks:

- [ ] Funds are provisioned to the CashRemuneration contract through Bank `transferFrom`
- [ ] The contract holds sufficient balance per token before a member can withdraw (an under-funded
      withdrawal fails on-chain — see US-PAYROLL-010)

**Priority:** P1 (Critical) · **Effort:** — · **Status:** 🔗 Reference (see Bank) ·
**Dependencies:** US-TEAM-001, [Bank](../contracts/bank/README.md)

---

## US-PAYROLL-004: Set Weekly Goals

**As a** team member **I want to** write down my goals for the week **So that** my planned work is
visible alongside my claims

**Acceptance Criteria:**

- [ ] A member with a wage can submit a free-form (Markdown) goals memo for a week
- [ ] Goals can be set **before** any hours are logged (this creates an empty pending week)
- [ ] Re-submitting updates the existing memo (exactly one memo per week)
- [ ] A member without a wage cannot set goals (button disabled; 400 "No wage found for the user")
- [ ] Goals are locked once the week is signed / withdrawn / disabled (409 "Week already signed /
      withdrawn / Week is disabled")

**Priority:** P3 (Medium) · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-001

---

## US-PAYROLL-005: Submit a Daily Claim

**As a** team member **I want to** log the hours I worked on a given day **So that** I can be paid
for that week's work

**Acceptance Criteria — happy path & fields:**

- [ ] With a wage, the "Submit Claim" button is enabled; without a wage it is disabled ("You need to
      have a wage set up to submit claims")
- [ ] The form has: Date, Hours worked (whole hours) + Minutes (only 0/10/20/30/40/50), Memo, and up
      to 10 file attachments
- [ ] Total duration must be greater than 0, a multiple of 10 minutes, and between 10 minutes and 24
      hours
- [ ] Memo is required and limited to 3000 words
- [ ] On submit the claim is added to the week with status "pending"; toast "Wage claim added
      successfully"

**Acceptance Criteria — caps:**

- [ ] _(daily cap)_ Hours above the daily cap are rejected inline ("Cannot exceed N hours"); a total
      above the cap shows "Cannot exceed daily cap of N hours"
- [ ] _(daily cap)_ New hours **plus hours already claimed that day** cannot exceed the daily cap;
      the inline error gives the breakdown ("Daily limit would be exceeded. Allowance… Already
      claimed… Remaining…")
- [ ] The **week** total across all days cannot exceed the weekly allowance (regular + overtime
      hours); the server rejects with a weekly allowance / submitted / remaining breakdown (409)
- [ ] _(daily cap)_ The server enforces the daily cap on every submit even if the form is bypassed,
      falling back to **8h** for wages with no explicit cap

**Acceptance Criteria — edge cases:**

- [ ] When submission restriction is active, only the current ISO week (up to 4 days back) can be
      claimed: other days are disabled in the date picker and rejected server-side ("claims can only
      be submitted for the current week, up to 4 days in the past")
- [ ] Already-signed weeks are disabled in the date picker
- [ ] Submitting into a week that is already signed / withdrawn / disabled is blocked ("This week
      claim is already X, you cannot submit new claims"; 409)
- [ ] Submitting against a disabled wage is blocked (400)
- [ ] More than 10 attachments are rejected (400)

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-001

> **_(daily cap)_ note:** the server is the authority. The in-form check is early feedback and has
> two harmless gaps the server still covers — the edit form (US-PAYROLL-006) skips the "already
> claimed" breakdown, and a wage with no explicit cap falls back to 24h in the form vs 8h on the
> server.

---

## US-PAYROLL-006: Edit a Daily Claim

**As a** team member **I want to** correct a claim I already submitted **So that** I can fix
mistakes before the week is approved

**Acceptance Criteria:**

- [ ] The owner of a pending claim can edit hours/minutes, memo, and add/remove attachments; toast
      "Claim updated successfully"
- [ ] The claim's **date cannot be changed** on edit (the date field is locked)
- [ ] Field rules match submission (duration, memo ≤ 3000 words, ≤ 10 files total)
- [ ] The **weekly** cap is re-checked excluding this claim (409 breakdown if exceeded)
- [ ] _(daily cap)_ The **daily** cap is re-checked for the claim's day, excluding this claim (409
      breakdown if exceeded)
- [ ] Only the claim owner can edit (403)
- [ ] Only claims in a pending (or disabled) week can be edited (403 "Can't edit: Claim is not
      pending")
- [ ] Editing is blocked while the wage is disabled (403)
- [ ] _(daily cap)_ Known gap: the edit form applies the raw daily cap but not the "already claimed
      that day" breakdown — the server still enforces it

**Priority:** P2 (High) · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-005

---

## US-PAYROLL-007: Delete a Daily Claim

**As a** team member **I want to** delete a claim I submitted **So that** I can remove an entry
logged by mistake

**Acceptance Criteria:**

- [ ] The owner of a pending claim can delete it; a confirmation modal shows the claim's duration
      and date; toast "Claim deleted successfully"
- [ ] Deleting removes the claim's file attachments from storage
- [ ] Deleting the **last** claim of a week removes the empty week, **unless** the week still has
      weekly goals (then the week is kept)
- [ ] Only the claim owner can delete (403)
- [ ] Only claims in a pending (or disabled) week can be deleted (403)
- [ ] Deleting is blocked while the wage is disabled (403)
- [ ] The Delete button is disabled while the team is archived

**Priority:** P2 (High) · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-005

---

## US-PAYROLL-008: Approve (Sign) a Weekly Claim

**As a** CashRemuneration owner **I want to** sign a member's completed weekly claim **So that**
they are authorised to withdraw that week's pay

**Acceptance Criteria:**

- [ ] Only the CashRemuneration contract owner sees "Approve" / "Sign" (the team owner is also
      accepted by the server)
- [ ] Approving prompts a wallet **EIP-712 signature** (domain CashRemuneration v1, current
      contract, current chain); on success the week becomes "signed" with the toast "Claim approved"
- [ ] Only a week with **at least one claim** can be signed (no button when empty)
- [ ] The current week and next week cannot be approved ("wait until the week is over" — button
      disabled; server "Week not yet completed")
- [ ] Only pending weeks can be signed (else "Weekly claim already signed / withdrawn")
- [ ] Signing is frozen when the team hasn't migrated to the current contract or is archived
      (tooltip explains why)
- [ ] The server rejects if the signed-against contract ≠ the team's current CashRemuneration
      contract, or if the recovered signer ≠ the caller ("Recovered signer does not match the
      caller")
- [ ] A wallet rejection surfaces "User rejected the request"
- [ ] **Re-sign** flow: a stale signature (after an Officer redeploy) can be re-signed against the
      current contract ("Resign"); if the claim was disabled on-chain it is re-enabled first

**Priority:** P1 (Critical) · **Effort:** L · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-005

---

## US-PAYROLL-009: Disable / Re-enable a Signed Weekly Claim

**As a** team / CashRemuneration owner **I want to** revoke a signed weekly claim and restore it if
needed **So that** I can stop a payout before it is withdrawn

**Acceptance Criteria:**

- [ ] The CashRemuneration owner or the team owner can **disable** a signed weekly claim, and
      **re-enable** it
- [ ] Re-enabling requires an existing signature ("No claim existing signature: You need to sign
      claim first")
- [ ] A withdrawn claim cannot be disabled or enabled ("Weekly claim already withdrawn")
- [ ] An already-disabled claim cannot be re-disabled; an already-active claim cannot be re-enabled
- [ ] Non-owners are rejected ("Caller is not the Cash Remuneration owner or the team owner")

**Priority:** P2 (High) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-008

---

## US-PAYROLL-010: Withdraw an Approved Weekly Claim

**As a** team member **I want to** withdraw my signed weekly claim **So that** I receive my pay in
my wallet

**Acceptance Criteria:**

- [ ] For a signed week, the member (the wage owner) sees "Withdraw"; withdrawing runs an **on-chain
      transaction** paying every token / equity entry in the claim
- [ ] On success the toast "Claim withdrawn" appears and the status is reconciled to "withdrawn"
      (via the sync in US-PAYROLL-011)
- [ ] The Withdraw button is disabled once the claim is withdrawn, and while the team is archived
- [ ] Only a signed claim can be withdrawn (server "Weekly claim must be signed before it can be
      withdrawn")
- [ ] _(API)_ Withdrawing someone else's weekly claim is refused — a user outside the team gets 403
      "Caller is not a member of the team", and a teammate who is not the claim's member gets 403
      "Caller is not the owner of this weekly claim". The claim keeps its "signed" status and the
      real member keeps their Withdraw button.
- [ ] _(API)_ The team owner / Cash Remuneration owner cannot withdraw on a member's behalf either —
      approving and being paid are separate rights
- [ ] Withdrawal is blocked when the signature was issued for a different contract ("Signature
      issued for a different CashRemuneration contract") or a different network ("… different
      network")
- [ ] A missing signature is blocked ("Missing signature")
- [ ] A signature that no longer matches the current contract owner is blocked ("Signature no longer
      valid — contract ownership has changed" / "Invalid signature for this contract")
- [ ] An under-funded contract makes the on-chain withdrawal fail (see US-PAYROLL-003)
- [ ] A wallet rejection is silent (no error toast)

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:**
US-PAYROLL-008, US-PAYROLL-003

---

## US-PAYROLL-011: Sync Weekly-Claim Status with the Chain

**As a** system **I want to** reconcile each weekly claim's status against on-chain state **So
that** the portal reflects what actually happened on-chain

**Acceptance Criteria:**

- [ ] Sync checks every signed / disabled week against the chain and updates it (paid → "withdrawn",
      disabled → "disabled")
- [ ] A signature bound to a **previous** contract (Officer redeploy) is reset to "pending" with its
      signature cleared, so the owner re-signs (US-PAYROLL-008)
- [ ] Sync runs automatically after a successful withdrawal
- [ ] Rows whose contract state cannot be read are skipped, not failed (the rest still sync)

**Priority:** P2 (High) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-008

---

## US-PAYROLL-012: View Claim History & Payroll Overview

**As a** team member or owner **I want to** review weekly claims and their status **So that** I can
track work logged and payments made

**Acceptance Criteria:**

- [ ] Members see their own weekly claims: each week shows status, hours, amounts, a daily
      breakdown, weekly goals, and attachments
- [ ] Weekly claims can be filtered by status (pending / signed / withdrawn / disabled) and by
      member; totals aggregate the minutes worked
- [ ] The company payroll table is paginated (page + limit, up to 100 rows/page); other views load
      the full set with the same `{ data, total }` shape
- [ ] A member only sees their own records — other members' claims are never leaked
- [ ] An invalid status or member-address filter is rejected (400)

**Priority:** P2 (High) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-PAYROLL-005

---

## How to Use These User Stories

1. **For QA:** walk each story top to bottom and tick every box; a fully-ticked document means every
   payroll use case and edge case has been exercised.
2. **For Development:** pick a story, read its criteria, build/adjust the feature.
3. **For Product:** prioritise by P1 > P2 > P3 and by the lifecycle order above.

---

_[← Back to Cash Remuneration contract](../contracts/cash-remuneration/README.md)_
