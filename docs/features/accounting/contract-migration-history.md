# Accounting — History Across Contract Migrations — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL)

These stories describe how the **accounting books survive a contract migration**. When a team
redeploys its Officer, the money-pocket contracts (Bank, Expense, CashRemuneration, FixedReturn,
Investor) get **new addresses**; the previous ones keep living on-chain with all their past
transactions. The books must consolidate **every generation**, not just the current one. The
acceptance criteria are written as a **testing checklist**: once every box is ticked, the migration
use cases and edge cases are covered. |

### Lifecycle (test in this order)

1. **Set up a Team & do some token transactions on different contracts to get history.**
2. **Redeploy the Officer.**
3. **Verify consolidation.** Go back to **Accounting**: the pre-migration transactions are still
   there, **exactly once**, next to the new ones.
4. **Treasury sweep.** From the **Bank**, move the remaining funds from the old
   contract to the new one → it must appear as an **internal move** (the income statement does not
   change).
5. **Repeat 2 → 4** to validate several successive migrations.

> Note: the **per-contract views** (Bank / Expense / …) intentionally show only the current
> contract's transactions (they are per-contract, not consolidated). Only **Accounting**
> consolidates every generation.

### Terminology

- **Generation** — one deployment of a team's contracts, tied to one Officer, with its own
  `deployBlockNumber` (its scan boundary).
- **Safe** — the team's Safe survives a redeploy and keeps the same address across generations (no
  deploy boundary of its own).
- **Treasury sweep** — a transfer that moves funds from an old contract to its replacement (e.g. old
  Bank → new Bank) during/after a migration. It is an **internal move**, not revenue or expense.
- **On-chain identity** — an event's `txHash`-`logIndex`. Used to deduplicate; never displayed.

---

## Status Overview

| User Story     | Title                                   | Actor  | Status | Priority | Effort |
| -------------- | --------------------------------------- | ------ | :----: | :------: | ------ |
| US-ACCTMIG-001 | History survives migrations             | Viewer |   ✅   |    P1    | L      |
| US-ACCTMIG-002 | Treasury sweeps stay internal           | Viewer |   ✅   |    P1    | M      |
| US-ACCTMIG-003 | Robust, failure-tolerant event handling | System |   ✅   |    P1    | M      |

---

## US-ACCTMIG-001: History Survives Migrations

**As a** team owner or member viewing Accounting **I want to** keep seeing every past transaction
after one or more contract redeploys **So that** the books are never wiped by a migration

**Acceptance Criteria — happy path:**

- [ ] After the team redeploys its Officer (new Bank/Expense/… addresses), the Accounting page still
      shows **every** transaction made on the **previous** generation
- [ ] Transactions made **after** the migration appear in the **same** consolidated ledger alongside
      the old ones
- [ ] Every transaction appears **exactly once** — never duplicated across the before/during/after
      boundary
- [ ] Each generation is scanned from its **own deploy block**, not a single global start block
- [ ] The **Safe** keeps its history unchanged — it is the only contract that does not change
      address on a redeploy
- [ ] After **N** migrations, the ledger holds the complete history of all **N+1** generations;
      totals span the entire history

**Acceptance Criteria — edge cases:**

- [ ] A generation with **no** money moves does not break consolidation (the others stay complete)
- [ ] The **oldest** generation is still scanned from its deploy boundary — never truncated by a
      too-recent start block
- [ ] Archived generations are visible under _Contract Management → Deployment history_, but their
      transactions are **never removed** from Accounting
- [ ] When the generation history is unavailable (older data), the page degrades gracefully to the
      current generation instead of erroring _(see US-ACCTMIG-003)_

**Priority:** P1 (Critical) · **Effort:** L · **Status:** ✅ Done

---

## US-ACCTMIG-002: Treasury Sweeps Stay Internal

**As a** team owner **I want to** move funds from an old contract to its replacement without it
looking like income or a cost **So that** the income statement stays accurate through a migration

**Acceptance Criteria — happy path:**

- [ ] A transfer from an old contract to its replacement (e.g. old Bank → new Bank) is booked as an
      **internal move** — no revenue, no expense
- [ ] Both endpoints of the sweep are recognised as **team-owned** across generations
- [ ] The income statement is **unaffected**: cash simply relocates between pockets
- [ ] A sweep leaves the **total cash unchanged** (it only moves between pockets)

**Acceptance Criteria — edge cases:**

- [ ] A sweep involving the **Safe** on one side and a generation contract on the other is also
      recognised as internal
- [ ] A transfer to an **external** address (not team-owned) is still booked normally as revenue /
      expense — the internal registry only "swallows" moves between the team's own contracts
- [ ] A transfer between two contracts of the **same generation** stays internal as before (the
      migration does not change this behaviour)

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-ACCTMIG-001

---

## US-ACCTMIG-003: Robust, Failure-Tolerant Event Handling

**As a** system **I want to** merge each generation's events safely **So that** missing, duplicated
or reordered events never corrupt the books

**Acceptance Criteria — happy path:**

- [ ] Events from every generation are **merged** into one feed and **deduplicated** on their
      `txHash`-`logIndex` identity
- [ ] The result is **order-independent** — the same set of events yields the same books regardless
      of the order the chain returns them

**Acceptance Criteria — edge cases:**

- [ ] A generation that returns **no** events does not drop the others (partial history is kept)
- [ ] When the generation history is unavailable (older data), the page **degrades gracefully** to
      the current generation instead of erroring
- [ ] A generation whose RPC scan **fails** is isolated: the other generations still load, and the
      failed one is surfaced as a **reconciliation-gap warning** in the Accounting view

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-ACCTMIG-001

---

## Known Limitations / Follow-ups

- **Balance reconciliation not implemented** — the books are built from event scans, but the closing
  balances are not yet read from on-chain token balances and compared against `balanceSheet`.
  Tracked as a follow-up.
- **V2-only events** — the event decoders union the V0/V0.1/V1 ABIs; a money-moving event introduced
  only in V2 would need its ABI fragment + mapper added.
- **Current-generation reads** — Community-credit interest terms and SHER valuation are still read
  from the current generation only; pre-migration credit rounds fall back to cash-basis.

---

## How to Use These User Stories

1. **For QA:** walk each story top to bottom and tick every box; a fully-ticked document means every
   migration use case and edge case has been exercised.
2. **For Development:** pick a story, read its criteria, build/adjust the feature.
3. **For Product:** prioritise by P1 > P2 > P3 and review the Known Limitations before closing.

---

_[← Back to Accounting](./README.md)_
