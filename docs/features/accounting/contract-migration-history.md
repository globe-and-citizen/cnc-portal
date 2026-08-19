# Accounting — Contract Migration History — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-19 · **Issue:** #2456 · **PR:** #2504

These stories describe how the **accounting books survive a contract migration**. When a team
redeploys its Officer, the money-pocket contracts (Bank, Expense, CashRemuneration, FixedReturn,
Investor) get **new addresses**; the previous ones keep living on-chain with all their past
transactions. The books must consolidate **every generation**, not just the current one. The
acceptance criteria are written as a **testing checklist**: once every box is ticked, the migration
use cases and edge cases are covered.

### What "a migration" means here

1. A team runs on an **Officer** generation that governs a set of money-pocket contracts.
2. The owner **redeploys** the Officer (contract upgrade / migration). A **new generation** of
   contracts is created with **fresh addresses**; the previous generation is preserved on-chain and
   in the database.
3. The Accounting page must keep showing the **full history** across all generations, as one set of
   books.

### Terminology

- **Generation** — one deployment of a team's contracts, tied to one Officer, with its own
  `deployBlockNumber` (its scan boundary).
- **Officer-less pocket** — the **Safe** and **SafeDepositRouter** survive redeploys and keep the
  same address across generations (no deploy boundary of their own).
- **Treasury sweep** — a transfer that moves funds from an old contract to its replacement (e.g. old
  Bank → new Bank) during/after a migration. It is an **internal move**, not revenue or expense.
- **On-chain identity** — an event's `txHash`-`logIndex`. Used to deduplicate; never display
  metadata.

---

## Status Overview

| User Story     | Title                                           | Actor  | Status | Priority | Effort |
| -------------- | ----------------------------------------------- | ------ | :----: | :------: | ------ |
| US-ACCTMIG-001 | History survives a single migration             | Viewer |   ✅   |    P1    | L      |
| US-ACCTMIG-002 | History survives multiple successive migrations | Viewer |   ✅   |    P1    | M      |
| US-ACCTMIG-003 | Cross-generation treasury sweeps stay internal  | Viewer |   ✅   |    P1    | M      |
| US-ACCTMIG-004 | Closing balances reconcile across generations   | Viewer |   🔜   |    P2    | M      |
| US-ACCTMIG-005 | Robust, order-independent event handling        | System |   ✅   |    P1    | M      |
| US-ACCTMIG-006 | Consume the existing Officer-history endpoint   | System |   ✅   |    P1    | M      |
| US-ACCTMIG-007 | Documentation & manual verification             | —      |   ✅   |    P3    | S      |

> Criteria tagged _(API)_ describe a server response a UI tester cannot observe from the screen.
> Verify them with a direct API call rather than through the portal.

---

## US-ACCTMIG-001: History Survives a Single Migration

**As a** team owner or member viewing Accounting **I want to** keep seeing every past transaction
after a contract redeploy **So that** the books are never wiped by a migration

**Acceptance Criteria:**

- [ ] After the team redeploys its Officer (new Bank/Expense/… addresses), the Accounting page still
      shows every transaction made on the **previous** generation
- [ ] Transactions made **after** the migration appear in the same consolidated ledger alongside the
      old ones
- [ ] Every transaction appears **exactly once** — a transaction is never duplicated across the
      before/during/after boundary
- [ ] Each generation is scanned from its **own deploy block**, not a single global start block
- [ ] Officer-less pockets (Safe / SafeDepositRouter) keep their history unchanged (same address
      across generations)

**Priority:** P1 (Critical) · **Effort:** L · **Status:** ✅ Done · **Dependencies:** US-ACCTMIG-006

---

## US-ACCTMIG-002: History Survives Multiple Successive Migrations

**As a** team owner **I want to** migrate contracts more than once without losing books **So that**
long-lived teams keep a complete financial record

**Acceptance Criteria:**

- [ ] After **N** migrations, the ledger contains the complete history of all **N+1** generations
- [ ] No generation is silently dropped — totals span the entire history
- [ ] The oldest generation is still scanned from its deploy boundary

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-ACCTMIG-001

---

## US-ACCTMIG-003: Cross-Generation Treasury Sweeps Stay Internal

**As a** team owner **I want to** move funds from an old contract to its replacement without it
looking like income or a cost **So that** the income statement stays accurate through a migration

**Acceptance Criteria:**

- [ ] A transfer from an old contract to its replacement (e.g. old Bank → new Bank) is booked as an
      **internal move** — no revenue, no expense
- [ ] Both endpoints of the sweep are recognised as **team-owned** across generations
- [ ] The income statement is unaffected by the sweep; cash simply relocates between pockets

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-ACCTMIG-001

---

## US-ACCTMIG-004: Closing Balances Reconcile Across Generations

**As a** team owner **I want to** trust the closing balances after a migration **So that** the books
match what is actually held on-chain

**Acceptance Criteria:**

- [ ] The ledger's closing balances for supported accounts reconcile with the on-chain balances of
      the corresponding contracts, summed across all generations
- [ ] A sweep leaves the total cash unchanged (it only moves between pockets)

> **🔜 Not implemented in this PR.** This PR scans events and reads the SHER multiplier, but does
> not yet read on-chain token balances and compare them against `balanceSheet`. Full reconciliation
> is tracked as a follow-up (see Known Limitations); until then the sweep half (second box) holds,
> but the on-chain balance comparison does not.

**Priority:** P2 (High) · **Effort:** M · **Status:** 🔜 Follow-up · **Dependencies:**
US-ACCTMIG-003

---

## US-ACCTMIG-005: Robust, Order-Independent Event Handling

**As a** system **I want to** merge each generation's events safely **So that** missing, duplicated
or reordered events never corrupt the books

**Acceptance Criteria:**

- [ ] Events from every generation are **merged** into one feed and **deduplicated** on their
      `txHash`-`logIndex` identity
- [ ] The result is **order-independent** — the same set of events yields the same books regardless
      of the order the chain returns them
- [ ] A generation that returns **no events** does not drop the others (partial history is kept)
- [ ] When the Officer history is unavailable (older data), the page **degrades gracefully** to the
      current generation instead of erroring
- [ ] A generation whose RPC scan **fails** is isolated: the other generations still load, and the
      failed one is surfaced as a **reconciliation-gap warning** in the Accounting view

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-ACCTMIG-006

---

## US-ACCTMIG-006: Consume the Existing Officer-History Endpoint

**As a** system **I want to** get every contract generation from the endpoint that already serves it
**So that** the accounting layer scans them all without a duplicate API

**Acceptance Criteria:**

- [ ] _(API)_ Accounting reads generations from the existing `GET /contract/officers?teamId=`
      (`useGetTeamOfficersQuery`) — each Officer with its `contracts` and `deployBlockNumber` —
      rather than a new team-endpoint variant
- [ ] The officer-less pockets (Safe / SafeDepositRouter) are added as a single boundary-less
      generation, taken from the ordinary team response
- [ ] Old contract rows are **never deleted** on redeploy, so the history is complete

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-TEAM-001

---

## US-ACCTMIG-007: Documentation & Manual Verification

**As a** QA or developer **I want to** a written procedure to validate migration behaviour **So
that** the feature can be checked without reading the code

**Acceptance Criteria:**

- [ ] The migration use cases are documented (this file)
- [ ] A manual verification procedure is provided (below)

**Priority:** P3 (Medium) · **Effort:** S · **Status:** ✅ Done · **Dependencies:** —

---

## Manual Verification

Run against a local chain **without restarting the node** between deploys (a node restart wipes
on-chain history and invalidates the test).

1. Create a team and deploy its Officer; make a few money moves on the **Bank** (a deposit, a
   transfer). Confirm they show on **Accounting** and on the **Bank** view.
2. **Redeploy** the Officer on the **same** running node (new contract addresses).
3. Re-open **Accounting**: the pre-migration transactions must still be there, exactly once, next to
   any new ones.
4. _(API check)_ `GET /contract/officers?teamId=<id>` returns **at least two** Officer generations,
   including the one governing the **old** Bank address, each with its `deployBlockNumber`.
5. Do a **treasury sweep** (old Bank → new Bank): it must appear as an internal move — the income
   statement must not change.
6. Repeat steps 2–3 a second time to confirm **multiple** migrations keep the full history.

> Note: the **Bank / Expense / … per-contract views** intentionally show only the current contract's
> transactions (they are per-contract, not consolidated). Only **Accounting** consolidates every
> generation. Extending the per-contract views is a separate product decision.

---

## Known Limitations / Follow-ups

- **Balance reconciliation (US-ACCTMIG-004) is not implemented** — the books are built from event
  scans, but the closing balances are not yet read from on-chain token balances and compared against
  `balanceSheet`. Tracked as a follow-up.
- **V2-only events** — the event decoders union the V0/V0.1/V1 ABIs; a money-moving event introduced
  only in V2 would need its ABI fragment + mapper added.
- **Current-generation reads** — Community-credit interest terms and SHER valuation are still read
  from the current generation only; pre-migration credit rounds fall back to cash-basis.

---

## How It Works (pointers)

- **Backend** — no new endpoint: accounting reuses the existing `GET /contract/officers`
  (`getTeamOfficers` in `backend/src/controllers/contractController.ts`).
- **Frontend** — `useCNCAccounting` composes `useGetTeamQuery` + `useGetTeamOfficersQuery` to build
  one scan target per generation (`app/src/composables/accounting/useCNCAccounting.ts`);
  `scanContractLogs` scans each generation in isolation, merges and deduplicates across generations,
  and returns any failed generations as gaps (`app/src/composables/eventsViaLogs.ts`); the
  internal-address registry (`app/src/utils/accounting/internalAddresses.ts`) is fed every
  generation so sweeps read as internal.

---

## How to Use These User Stories

1. **For QA:** run the Manual Verification steps and tick every box in each story.
2. **For Development:** pick a story, read its criteria, build/adjust the feature.
3. **For Product:** prioritise by P1 > P2 > P3, and review the Known Limitations before closing.

---

_[← Back to Accounting](./README.md)_
