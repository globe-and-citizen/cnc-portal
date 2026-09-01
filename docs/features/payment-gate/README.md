# Payment Gate — v0 (Light)

Scoped to what v0 actually needs to ship. Just wiring an embeddable widget on top of what already exists.

## Feature description

CNC Pay lets a merchant — here called **Layer8** — embed a widget on their own page so their customers can pay them directly. Layer8 needs a
CNC account; payments land straight into that team's existing Bank contract.

CNC Pay's job stops at collecting the payment: we receive an amount Y and a facture ID Z, and we charge Y for Z. What Z represents isn't our
concern — that's Layer8's to define and interpret. This base already makes both **Pay now** and **Pay as you go** work; it's up to Layer8 to
decide how to use it, e.g. what a facture ID represents for pay-as-you-go usage.

### Payment flow (v0)

1. A customer triggers a payment on Layer8's page — e.g. usage under a pay-as-you-go plan. Layer8 already knows the amount and shows the
   customer their facture (invoice).
2. Layer8 mounts the widget for that facture — amount + facture ID.
3. The widget shows a payment recap: amount and facture ID.
4. The customer pays.
5. The widget shows the conclusion of the transaction.

---

## Status Overview

| User Story        | Title                                   | Actor             |     Status     | Priority | Effort |
| ----------------- | --------------------------------------- | ----------------- | :------------: | :------: | ------ |
| US-PAYGATE-V0-001 | Configure the widget                    | Merchant          | 🔲 Not started |    P1    | S      |
| US-PAYGATE-V0-002 | Embed the widget on the merchant's page | Merchant          | 🔲 Not started |    P1    | M      |
| US-PAYGATE-V0-003 | Pay through the widget                  | Layer8's customer | 🔲 Not started |    P1    | L      |
| US-PAYGATE-V0-004 | Payment history                         | Merchant          | 🔲 Not started |    P2    | M      |
| US-PAYGATE-V0-005 | Recall (Recheck) a payment's status     | Merchant          | 🔲 Not started |    P2    | M      |

---

## US-PAYGATE-V0-001: Configure the Widget

**As a** merchant **I want to** configure the widget **so that** it matches my integration

**Acceptance Criteria:**

- [ ] The merchant configures the widget by specifying the accepted token (USDC, USDCe, POL)
- [ ] A widget preview shows the placement of the configured elements (amount, selected token)
- [ ] The token is the only element the merchant can configure — style and layout aren't editable in v0

**Priority:** P1 (Critical) · **Effort:** S · **Status:** 🔲 Not started · **Dependencies:** —

---

## US-PAYGATE-V0-002: Embed the Widget on the Merchant's Page

**As a** merchant (Layer8) **I want to** insert a script on my own page **so that** my customers can pay me directly

**Acceptance Criteria:**

- [ ] The merchant has a CNC account, and payments land on their team's Bank
- [ ] The script embeds the widget on the merchant's page, with the Bank address and the token configured in US-PAYGATE-V0-001
- [ ] For a specific order, the merchant passes the corresponding facture ID to the widget

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🔲 Not started · **Dependencies:** US-PAYGATE-V0-001

---

## US-PAYGATE-V0-003: Pay Through the Widget

**As a** Layer8 customer **I want to** pay directly from the widget **so that** I can settle my facture without leaving the merchant's page

**Acceptance Criteria:**

- [ ] The widget shows a payment recap: amount and facture ID
- [ ] The customer pays that amount for that facture ID — the widget doesn't distinguish Pay now from Pay as you go, it's up to Layer8 to
      interpret the facture ID
- [ ] The widget shows the conclusion of the transaction (pending/success/failed)
- [ ] Once the transaction broadcasts, the widget reports the `txHash` with the facture ID to CNC Pay — this record is what feeds the
      payment history (US-PAYGATE-V0-004)

**Priority:** P1 (Critical) · **Effort:** L · **Status:** 🔲 Not started · **Dependencies:** US-PAYGATE-V0-002

---

## US-PAYGATE-V0-004: Payment History

**As a** merchant **I want to** see the history of payments made through the widget **so that** I can track what my customers have paid

**Acceptance Criteria:**

- [ ] The merchant can view the list of past payments made through the widget
- [ ] Each entry shows at minimum the amount, the facture ID, and the status

**Priority:** P2 (High) · **Effort:** M · **Status:** 🔲 Not started · **Dependencies:** US-PAYGATE-V0-003

---

## US-PAYGATE-V0-005: Recall (Recheck) a Payment's Status

**As a** merchant **I want to** ask CNC Pay again for a payment's status by facture ID **so that** I can find that payment if I wasn't able
to record its status myself at payment time

**Acceptance Criteria:**

- [ ] The merchant can request a facture ID's status directly from CNC Pay (fallback, not the default path)
- [ ] This lookup only works if the `txHash` was registered beforehand (US-PAYGATE-V0-003) — without it, nothing links the facture ID to a
      transaction

**Priority:** P2 (High) · **Effort:** M · **Status:** 🔲 Not started · **Dependencies:** US-PAYGATE-V0-003

---

## Edge Cases (for team discussion)

Not decided yet — to review before considering v0 complete.

| Case                                       | Description                                                                                                                          | What needs deciding                                                                                                                                      | Proposal                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing or empty facture ID                | The merchant mounts the widget without `data-facture-id`                                                                             | Should the widget refuse to render, or show an explicit error?                                                                                           | Show an explicit error, e.g.: _"Invalid configuration: no facture ID provided."_                                                                                                |
| Token not configured                       | The merchant hasn't chosen a token on the widget yet                                                                                 | Is there a default token, or does the widget stay blocked until one is configured?                                                                       | Default token: USDC                                                                                                                                                             |
| Customer closes the page mid-transaction   | The payment is pending (`en cours`) when the customer leaves or reloads the page                                                     | Does the merchant have a way to recover the real status afterward, or is the payment just lost from view?                                                | Yes, via an endpoint. Two options: a contract function that takes the facture ID and amount, or registering the `txHash` directly in the database as soon as MetaMask validates |
| On-chain transaction failure (revert)      | The payment moves from "pending" to "failed"                                                                                         | Does the widget show the failure reason, or just "failed" with no detail?                                                                                | Show the reason, reworded to stay understandable for a human                                                                                                                    |
| Duplicate submission                       | The customer clicks pay twice, or reopens the widget for the same facture ID                                                         | Nothing today prevents a double payment for the same facture ID                                                                                          | The loader is meant to prevent the double-click. Still open: how to handle a duplicate facture ID (the widget reopened on an already-paid facture)                              |
| Zero or negative amount                    | Merchant-side configuration error                                                                                                    | Should the widget validate the amount before rendering anything?                                                                                         | Yes, validate, and show a warning on the widget                                                                                                                                 |
| The `txHash` report never reaches CNC Pay  | The customer closes the page, or the network drops, between the transaction broadcasting and the `txHash` report (US-PAYGATE-V0-003) | Without that report, nothing links the facture ID to the transaction — how does the merchant find this payment in their history (US-PAYGATE-V0-004)?     | —                                                                                                                                                                               |
| The `txHash` was never registered anywhere | Neither CNC Pay nor the merchant has a trace of the facture ID ↔ transaction link (Recall from US-PAYGATE-V0-005 is impossible)      | Two options to decide between: a contract function that takes the facture ID as a parameter (traceable on-chain), or a database record on CNC Pay's side | Same decision as above: a contract function that takes the facture ID and amount, or registering the `txHash` directly in the database as soon as MetaMask validates            |

---

## Implementation Evidence

**Implementation evidence reviewed against:** `5c2e661c93b5ec1062dd79b4e7378683eaf34fcb`

- [Integration setup view](../../../app/src/views/team/[id]/PaymentGate/IntegrationView.vue), combining
  [Bank address + embed snippet](../../../app/src/components/sections/PaymentGateView/IntegrationCard.vue),
  [accepted-token configuration](../../../app/src/components/sections/PaymentGateView/TokenConfigCard.vue), a
  [live widget preview](../../../app/src/components/sections/PaymentGateView/WidgetPreviewCard.vue), and their shared
  [pane markup](../../../app/src/components/sections/PaymentGateView/PaymentGateWidgetView.vue) (`US-PAYGATE-V0-001` and `002`).
- [Payment history view](../../../app/src/views/team/[id]/PaymentGate/HistoryView.vue),
  [history table card](../../../app/src/components/sections/PaymentGateView/HistoryCard.vue),
  [transaction-detail slide-over](../../../app/src/components/ui/TransactionDetailSlideover.vue), and
  [useFactureHistory](../../../app/src/composables/paymentGate/useFactureHistory.ts) (`US-PAYGATE-V0-004`).
- [Recall/reference view](../../../app/src/views/team/[id]/PaymentGate/ReferenceView.vue) and its
  [recheck-by-facture-ID card](../../../app/src/components/sections/PaymentGateView/ReferenceCard.vue) (`US-PAYGATE-V0-005`).
- [Shared contract-error catalog](../../../app/src/composables/contracts/errorCatalogs.ts) (`US-PAYGATE-V0-003`).

## Related Documentation

- [Transaction History implementation](../../implementation/transaction-history/README.md)
