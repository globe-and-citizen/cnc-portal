# Payment Gate — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-14

These stories describe the Payment Gate as it currently exists: a set of design decisions
([`flow-and-edge-cases.md`](./flow-and-edge-cases.md)) and a UI mockup built with real Nuxt UI
components (`app/src/views/team/[id]/PaymentGate/`), with **no backend behind it yet**. Every
story below is tagged with its real status — most are 🎨 UI-only today. Treat this document the
same way as the payroll one: once every box in every story is ticked, every use case and edge
case of the Payment Gate is covered — but today most boxes describe intended behaviour, not
verified behaviour.

### Lifecycle (test in this order)

1. Merchant **embeds the widget** on their own checkout page, using their team's Bank address.
2. Merchant **configures settlement modes and accepted tokens** on the Setup page.
3. Merchant **previews the checkout** to see exactly what a customer will see, live-linked to
   whichever modes are enabled.
4. For a specific order, the merchant's page **passes that order's facture ID to the widget**
   when mounting it — before the customer pays.
5. A customer **pays through the widget** — wallet signs, transaction broadcasts directly to
   Polygon. CNC Pay never custodies funds.
6. The widget **calls back with the payment status automatically**, the instant it's known,
   right there in the customer's browser (happy path) — no backend involved.
7. If that direct callback fails, the merchant **rechecks the payment** by facture ID and Bank
   address (fallback).
8. If neither the database nor a reported `txHash` can locate the payment, it is **unrecoverable**
   until the on-chain reference mechanism is built (open question, US-PAYGATE-008).

### Terminology (corrections vs. earlier drafts)

- **The identifier is the Bank address.** Earlier drafts had a `pk_live_...` publishable key;
  that concept was dropped. The Bank address routes payments directly, with nothing to look up.
- **"Facture ID" is the merchant's own order/invoice reference**, supplied by them — CNC Pay does
  not mint a separate opaque id for it to be echoed back and forth.
- **Confirmation is client-side by default.** The widget waits for its own transaction receipt in
  the browser and calls the merchant's page directly. Recheck
  (`GET /v1/payments/{facture-id}?bank={bankAddress}`) is the fallback for when that direct
  callback doesn't land — not the primary path.
- **There is no platform fee today.** Payments settle directly into the merchant's existing
  `Bank.sol`, unmodified.
- **Status here means implementation status, not design status.** A story marked 🎨 has a
  finished, reviewed design (see `flow-and-edge-cases.md`) but no backend or on-chain code yet.

---

## Status Overview

| User Story     | Title                                             | Actor    |    Status    | Priority | Effort |
| -------------- | -------------------------------------------------- | -------- | :----------: | :------: | ------ |
| US-PAYGATE-001 | Embed the widget on a merchant's page               | Merchant |   🔲 Not started |    P1    | M      |
| US-PAYGATE-002 | Configure settlement modes & accepted tokens        | Merchant |   🎨 UI mockup   |    P1    | S      |
| US-PAYGATE-003 | Preview the checkout experience                     | Merchant |   🎨 UI mockup   |    P3    | S      |
| US-PAYGATE-004 | Pay through the widget                              | Customer |   🔲 Not started |    P1    | L      |
| US-PAYGATE-005 | Get the payment status automatically, the instant it's known (happy path) | Merchant |   🔲 Not started |    P1    | M      |
| US-PAYGATE-006 | Recheck a payment by facture ID and Bank address (fallback) | Merchant |   🎨 UI mockup   |    P2    | M      |
| US-PAYGATE-007 | Meter usage for "Pay as you go"                     | Merchant |   🔲 Not started |    P3    | M      |
| US-PAYGATE-008 | Recover a lost facture ID ↔ transaction link         | System   | ❓ Open question |    P3    | —      |

---

## US-PAYGATE-001: Embed the Widget on a Merchant's Page

**As a** merchant **I want to** drop a script tag on my own checkout page **So that** my
customers can pay without me building any payment infrastructure

**Acceptance Criteria:**

- [ ] The Setup page shows the team's Bank address in a read-only field with a Copy button
- [ ] An embed snippet is shown (`<script src="https://pay.cncportal.io/widget.js" data-bank="{address}" async>` + a mount `<div id="cnc-pay">`), with its own Copy button
- [ ] No separate publishable key is issued anywhere — the Bank address is the only identifier a merchant needs
- [ ] 🔲 `widget.js` itself does not exist yet — this story documents the intended integration surface

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🔲 Not started · **Dependencies:** —

---

## US-PAYGATE-002: Configure Settlement Modes & Accepted Tokens

**As a** merchant **I want to** choose which checkout options my customers see and which tokens I
accept **So that** the gate matches how my business actually operates

**Acceptance Criteria:**

- [ ] "Pay now" is always on and cannot be disabled — the baseline, instant settlement to `Bank.sol`
- [ ] "Hold until delivery" and "Pay as you go" can each be toggled independently
- [ ] Accepted tokens default to MATIC (locked, cannot be removed), USDC, USDT; more can be added by symbol and removed again
- [ ] Turning off a settlement mode immediately removes it from the Preview page's mode picker and from the Reference page's status-flow list — no page reload needed
- [ ] 🔲 Toggling a mode or editing tokens does not call any contract yet (`Bank.addTokenSupport`, admin management, etc. are not wired) — state is local to the browser session only, reset on reload

**Priority:** P1 (Critical) · **Effort:** S · **Status:** 🎨 UI mockup · **Dependencies:** US-PAYGATE-001

---

## US-PAYGATE-003: Preview the Checkout Experience

**As a** merchant **I want to** see exactly what my customers will see **So that** I can verify
the setup before sending anyone real traffic

**Acceptance Criteria:**

- [ ] The Preview page renders the actual widget UI in a card
- [ ] Only settlement modes enabled on the Setup page appear in the widget's mode picker
- [ ] Switching mode changes the line items, the CTA label, and the settlement note shown
- [ ] "Pay as you go" shows fund-amount chips ($25 / $50 / $100) instead of a fixed line item
- [ ] Clicking through Review → Paying → Confirmed simulates the full flow with no real transaction
- [ ] The Confirmed state for "Pay as you go" shows a live-draining balance and a running log of simulated $0.08 charges

**Priority:** P3 (Medium) · **Effort:** S · **Status:** 🎨 UI mockup · **Dependencies:** US-PAYGATE-002

---

## US-PAYGATE-004: Pay Through the Widget

**As a** customer **I want to** pay a merchant without leaving their page **So that** checkout
feels native, not like being redirected to a third party

**Acceptance Criteria:**

- [ ] 🔲 Not started — this is what `widget.js` needs to do for real:
- [ ] Connect a wallet and read the customer's balance via a direct RPC read (no CNC Pay backend involved in this call)
- [ ] Construct and submit the transaction matching the selected mode (`Bank.sol` for Pay now, `AdCampaignManager.sol` for Hold until delivery / Pay as you go)
- [ ] The customer's own wallet signs and broadcasts — CNC Pay never custodies funds or holds a key
- [ ] The widget waits for its own transaction receipt client-side, without needing a backend to tell it the outcome

**Priority:** P1 (Critical) · **Effort:** L · **Status:** 🔲 Not started · **Dependencies:** US-PAYGATE-002

---

## US-PAYGATE-005: Get the Payment Status Automatically, the Instant It's Known (Happy Path)

**As a** merchant **I want to** receive a facture ID's payment status automatically, via a
callback I control, the instant it's known **So that** I can act on it without polling anything

**Acceptance Criteria:**

- [ ] 🔲 Not started — prerequisite: the merchant's page passes that order's facture ID to the widget when mounting it (data attribute or init call) — without it, the widget has no facture ID to report or call back with
- [ ] Once a transaction confirms in the customer's browser, the widget calls a JS callback the merchant provides, passing it the payment status
- [ ] What the merchant does with that status is entirely up to them — save it, display it, trigger fulfillment. CNC Pay's backend is not involved in this path at all
- [ ] Optionally, the widget also reports the `txHash` with the facture ID to CNC Pay — this is what makes US-PAYGATE-006 possible later
- [ ] Fallback if that report never reaches CNC Pay: embed the facture ID directly in the on-chain contract call itself, the same mechanism as US-PAYGATE-008 — the transaction becomes self-describing instead of depending on a separate off-chain report

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🔲 Not started · **Dependencies:** US-PAYGATE-004

---

## US-PAYGATE-006: Recheck a Payment by Facture ID and Bank Address (Fallback)

**As a** merchant **I want to** ask CNC Pay directly what happened to a payment **So that** I'm
not stuck if the direct callback never reached my page

**Acceptance Criteria:**

- [ ] The Reference page documents `GET /v1/payments/{facture-id}?bank={bankAddress}` as the fallback lookup — explicitly framed as a fallback, not the default path. The Bank address scopes the lookup to the right merchant, since a facture ID alone isn't guaranteed unique across merchants
- [ ] The example response shows `factureId`, `status`, `amount`, `token`, `mode`, `tx`
- [ ] The status-flow reference only lists the modes actually enabled on Setup (`pending → paid` for Pay now; `pending → held → released` for Hold until delivery; `funding → active → depleted/refilled` for Pay as you go)
- [ ] Two edge cases are surfaced as alerts on the page: the direct callback failing (checked via the reported `txHash`, if any), and the database losing the facture ID ↔ `txHash` link entirely
- [ ] 🔲 The endpoint itself does not exist yet — this page is documentation and a UI shell

**Priority:** P2 (High) · **Effort:** M · **Status:** 🎨 UI mockup · **Dependencies:** US-PAYGATE-005

---

## US-PAYGATE-007: Meter Usage for "Pay as You Go"

**As a** merchant using metered billing **I want to** draw down a customer's prepaid balance per
usage event **So that** I can charge for consumption instead of a fixed price

**Acceptance Criteria:**

- [ ] 🔲 Not started — CNC Pay can only manage the balance and execute a "charge $X now" call when told to; it has no way to know what a "unit" of the merchant's own service is
- [ ] The merchant's own backend must count usage (clicks, API calls, whatever their billable unit is) and call CNC Pay's charge endpoint per event
- [ ] Enabling "Pay as you go" is an implicit commitment to build that counting logic — unlike the other two modes, this one is never zero-backend
- [ ] Auto-refill, if offered, is either an ERC-20 `approve()` allowance (works for USDC/USDT, not native MATIC) or a fresh signature prompt once the balance is exhausted — there is no third, fully invisible option

**Priority:** P3 (Medium) · **Effort:** M · **Status:** 🔲 Not started · **Dependencies:** US-PAYGATE-002, US-PAYGATE-004

---

## US-PAYGATE-008: Recover a Lost Facture ID ↔ Transaction Link

**As a** system **I want to** find a payment from its facture ID alone, even if the database that
tracked it is lost **So that** the platform doesn't have a single point of failure for locating a
merchant's money

**Acceptance Criteria:**

- [ ] ❓ Open question — not decided. Today the facture ID ↔ `txHash` link exists **only** in CNC Pay's database; nothing on `Bank.sol` carries it, so it is not recoverable purely from the chain
- [ ] Two solutions were identified, neither built: a dedicated function added directly to `Bank.sol`, or a separate intermediary contract — either would need to accept and emit the facture ID in an `indexed` event parameter for it to be efficiently searchable (`eth_getLogs`, filtered by topic)
- [ ] Raw calldata is **not** a viable substitute: even if a facture ID were appended to `depositToken()`'s calldata, it would not be indexed or searchable — the transaction hash would already need to be known
- [ ] `receive()` cannot carry any extra data at all — non-empty calldata on a plain transfer fails outright, since `Bank.sol` has no `fallback()`

**Priority:** P3 (Medium) · **Effort:** — · **Status:** ❓ Open question · **Dependencies:** US-PAYGATE-006

---

## How to Use These User Stories

1. **For QA:** once a backend exists, walk each story top to bottom and tick every box; a
   fully-ticked document means every Payment Gate use case and edge case has been exercised.
2. **For Development:** pick a story, read its criteria, build the piece it describes — most
   stories here are a build target until their status changes.
3. **For Product:** prioritise by P1 > P2 > P3, in the lifecycle order above. US-PAYGATE-004
   (the widget actually paying) is the real critical path — everything else is configuration or
   fallback around it.

---

_[← Back to Payment Gate flow & edge cases](./flow-and-edge-cases.md)_
