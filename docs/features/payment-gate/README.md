# Payment Gate — User Stories

**Scope:** Configuring, embedding, and paying through the CNC Pay widget from a company's Setup, Reference, and History pages at
`/teams/:id/payment-gate`, `/reference`, and `/history`

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).

`US-PAYGATE-V0-*` identifiers are retained because the Sprint 18 validation script and related documentation already reference them. `v0`
names the current, and so far only, delivery boundary of this capability — not a historical planning label superseded by a later version.

## Product Model

- **CNC Pay** is an embeddable widget: a merchant — called **Layer8** in this document — drops one script tag on their own page so their
  customers can pay them directly. Payments settle straight into Layer8's existing CNC company Bank contract; no separate CNC Pay account or
  key exists.
- A **facture ID** is an opaque, merchant-defined order reference (e.g. an invoice or usage-period ID). CNC Pay does not interpret it — it
  is carried as length-prefixed bytes appended after the standard `depositToken(token, amount)` calldata (see
  [`factureCalldata.ts`](../../../app/src/utils/paymentGate/factureCalldata.ts)) and read back later to reconstruct history.
- This version only supports **`depositToken()` targets** (USDC, USDCe). Native POL cannot carry a facture ID: `Bank.sol`'s `receive()`
  reverts on any non-empty calldata and has no `fallback()`, so the widget itself always refuses a native-token configuration (see
  `US-PAYGATE-V0-003`).
- **No backend exists for this capability.** Payment history is read directly from the Bank contract's deposit events (see
  `US-PAYGATE-V0-004`); recalling a payment by facture ID (`US-PAYGATE-V0-005`) has no implemented mechanism yet, on-chain or off-chain.

## Lifecycle

1. The merchant selects the token the widget will accept on the Setup page and gets a copyable embed snippet built around their company's
   Bank address.
2. The merchant pastes that snippet onto their own page. Whatever triggers checkout for a specific order calls
   `CncPay.setFactureId`/`setAmount`/`show()` with that order's real ID and amount.
3. The widget shows a payment recap (amount and facture ID), then the customer pays.
4. The widget reports the outcome — success or failure, with the facture ID — to the merchant's page through the `onStatus` callback.
5. Confirmed payments become visible on the merchant's History page, read directly from their Bank contract.

## Status Overview

| User Story        | Title                                   | Actor           | Status        |
| ----------------- | --------------------------------------- | --------------- | ------------- |
| US-PAYGATE-V0-001 | Configure the Widget's Accepted Token   | Merchant        | 🧪 Validation |
| US-PAYGATE-V0-002 | Embed the Widget on the Merchant's Page | Merchant        | 🧪 Validation |
| US-PAYGATE-V0-003 | Pay Through the Widget                  | Layer8 customer | 🧪 Validation |
| US-PAYGATE-V0-004 | Review Payment History                  | Merchant        | 🧪 Validation |
| US-PAYGATE-V0-005 | Recall a Payment's Status by Facture ID | Merchant        | 📝 Draft      |

## US-PAYGATE-V0-001: Configure the Widget's Accepted Token

**As a** merchant\
**I want to** choose which token the widget accepts\
**So that** my embed snippet and live preview reflect a payment configuration my customers can actually complete

### Acceptance Criteria

#### Happy Path

- [x] The merchant can select an accepted token from the options offered on the Setup page, and the embed snippet and live preview update
      immediately to reflect that choice.

#### Business Rules

- [x] No product element other than the accepted token is configurable in this version — style and layout are fixed.
- [ ] Only tokens the widget can actually accept payment in are offered as selectable options.

**Dependencies:** none — this is the capability's entry point

## US-PAYGATE-V0-002: Embed the Widget on the Merchant's Page

**As a** merchant (Layer8)\
**I want to** copy a ready-to-use script snippet carrying my company's Bank address and configured token\
**So that** I can accept payments on my own page without creating or managing a separate account or key

### Acceptance Criteria

#### Happy Path

- [x] The merchant can view and copy their company's Bank address.
- [x] The merchant can view and copy a complete embed snippet — script tag, mount point, and example checkout wiring — reflecting the
      current Bank address and selected token.

#### Business Rules

- [x] The Bank address shown is the company's own existing Bank contract; embedding the widget requires no separate account or key.

#### Edge & Error Cases

- [ ] When the company has no deployed Bank contract yet, the Setup page shows an explicit "no Bank" state instead of a snippet built around
      a placeholder address.

**Dependencies:** US-PAYGATE-V0-001 and a company with a deployed Bank contract

## US-PAYGATE-V0-003: Pay Through the Widget

**As a** Layer8 customer\
**I want to** pay directly from the embedded widget\
**So that** I can settle my facture without leaving the merchant's page

### How It Works

1. The widget shows a recap of the amount and facture ID.
2. On submit, it connects the customer's wallet, approves the token spend only if the existing allowance is insufficient, then submits the
   payment.
3. It reports the outcome to the merchant's page through `onStatus`.

### Acceptance Criteria

#### Happy Path

- [x] The widget shows a payment recap — amount and facture ID — before the customer pays.
- [x] A successful payment settles the exact configured amount to the company's Bank and shows the customer a confirmation with the amount,
      facture ID, and transaction hash.
- [x] The widget reports the payment's outcome — success or failure, with the facture ID — to the merchant's page through the `onStatus`
      callback.

#### Business Rules

- [x] Configuring the widget with an unsupported payment token (including native POL) shows an explicit "unsupported token" message instead
      of a payment form.
- [x] The widget only requests an ERC-20 approval when the customer's existing allowance is insufficient for the configured amount.
- [x] The facture ID must be 1-64 characters of letters, digits, and `- _ . / :` before use; an invalid value throws synchronously to the
      merchant's own integration code rather than reaching the chain. _(system)_

#### Edge & Error Cases

- [ ] A transaction confirmed on-chain is only reported as a successful payment when the Bank's deposit event for that payment is present in
      the receipt. _(contract)_
- [x] A transaction that reverts on-chain after broadcast is reported to the customer as failed, not successful.
- [ ] A wallet-rejected payment shows a clear cancellation message, not the raw wallet/SDK error.
- [ ] An on-chain revert (e.g. insufficient balance) shows a decoded, readable reason, not the raw contract/SDK error.
- [ ] After a failed payment, the customer can retry without leaving the widget or the merchant reloading their page.

**Dependencies:** US-PAYGATE-V0-002, a connected wallet, and a sufficient token balance

## US-PAYGATE-V0-004: Review Payment History

**As a** merchant\
**I want to** see the payments made through the widget\
**So that** I can track what my customers have paid without a separate backend record

### Acceptance Criteria

#### Happy Path

- [x] The merchant can view a table of confirmed payments made through the widget, each showing its facture ID, date, amount and token, and
      a link to the underlying transaction.
- [x] Selecting a payment's transaction opens its on-chain detail — initiator, block, timestamp, status, decoded call, and events.

#### Business Rules

- [x] History is derived directly from the company's Bank contract's token-deposit events; no separate backend record exists to fall out of
      sync.
- [x] Only deposits carrying a decodable facture ID are listed; a plain, non-widget Bank deposit is excluded.

#### Edge & Error Cases

- [x] An empty history is shown as an explicit empty state, not an empty table with no explanation.
- [x] A failed history read is shown as an explicit error instead of a silently empty or stale table.

**Dependencies:** US-PAYGATE-V0-003

## US-PAYGATE-V0-005: Recall a Payment's Status by Facture ID

**As a** merchant\
**I want to** look up a payment's status directly by facture ID\
**So that** I can still find a payment if the widget's `onStatus` callback never reached my page

### Acceptance Criteria

#### Happy Path

- [ ] A merchant can submit a facture ID and Bank address and receive that payment's real current status.

#### Business Rules

- [ ] The mechanism linking a facture ID to its on-chain transaction — a contract-level record or a database record — is decided and
      implemented.

**Dependencies:** US-PAYGATE-V0-003

## Known Gaps

- The Setup page's token selector still offers POL even though the widget always refuses it — any token whose ID resolves to the native
  asset is treated as unsupported. A merchant who configures POL gets a working-looking embed snippet that shows every customer an
  "Unsupported payment token" message instead of a payment form (`US-PAYGATE-V0-001`).
- When a company has no deployed Bank contract, the Setup page still renders a complete embed snippet built around the literal placeholder
  text `0x…` instead of an explicit "no Bank yet" state (`US-PAYGATE-V0-002`).
- A payment is reported to the customer as successful whenever the transaction receipt's status is `success`, without confirming the Bank's
  deposit event actually appears in that receipt. A transaction sent to an address with no contract code — a stale or misconfigured Bank
  address — is treated by the EVM as a no-op value transfer and can report a false success (`US-PAYGATE-V0-003`).
- Wallet-rejection and on-chain-revert errors are shown to the customer as the raw wallet/SDK error text, not a decoded, readable message
  (`US-PAYGATE-V0-003`).
- A failed payment is a dead end inside the widget: there is no way to retry without the merchant's own page re-invoking `CncPay.show()`
  from scratch (`US-PAYGATE-V0-003`).
- Payment history offers no filtering or pagination; a company with a long payment history sees every confirmed payment in one unbounded
  table (`US-PAYGATE-V0-004`).
- Recall/recheck by facture ID (`US-PAYGATE-V0-005`) has no implementation and no decided mechanism. The Reference page is a static
  illustration of the intended request/response shape only.

## Implementation Evidence

**Implementation evidence reviewed against:** `a8d1bf8fd6b6c597f9002cd9f93f92e45b320157`

- [Setup page](../../../app/src/views/team/[id]/PaymentGate/IntegrationView.vue), combining
  [Bank address + embed snippet](../../../app/src/components/sections/PaymentGateView/IntegrationCard.vue),
  [accepted-token configuration](../../../app/src/components/sections/PaymentGateView/TokenConfigCard.vue), a
  [live widget preview](../../../app/src/components/sections/PaymentGateView/WidgetPreviewCard.vue), and their shared
  [pane markup](../../../app/src/components/sections/PaymentGateView/PaymentGateWidgetView.vue) (`US-PAYGATE-V0-001`, `002`).
- [Widget entry point](../../../app/src/widget/main.ts), [payment flow](../../../app/src/widget/payment.ts),
  [widget root component](../../../app/src/widget/WidgetApp.vue), and the
  [facture-ID calldata encoding](../../../app/src/utils/paymentGate/factureCalldata.ts) (`US-PAYGATE-V0-003`).
- [History page](../../../app/src/views/team/[id]/PaymentGate/HistoryView.vue),
  [history table card](../../../app/src/components/sections/PaymentGateView/HistoryCard.vue),
  [transaction-detail slide-over](../../../app/src/components/ui/TransactionDetailSlideover.vue), and
  [useFactureHistory](../../../app/src/composables/paymentGate/useFactureHistory.ts) (`US-PAYGATE-V0-004`).
- [Reference page](../../../app/src/views/team/[id]/PaymentGate/ReferenceView.vue) and its
  [recall-by-facture-ID card](../../../app/src/components/sections/PaymentGateView/ReferenceCard.vue) (`US-PAYGATE-V0-005`).
- [Shared contract-error catalog](../../../app/src/utils/errors/contractCatalog.ts), decoded via
  [describeWidgetError](../../../app/src/widget/errorMessage.ts) (`US-PAYGATE-V0-003`).
- [Current Bank contract](../../../contract/contracts/Bank.sol) — the on-chain target every payment settles into.
- [Facture-ID calldata encoding tests](../../../app/src/utils/paymentGate/__tests__/factureCalldata.spec.ts),
  [widget payment-flow tests](../../../app/src/widget/__tests__/payment.spec.ts), and
  [error-message decoding tests](../../../app/src/widget/__tests__/errorMessage.spec.ts).

## Related Documentation

- [Bank contract behaviour](../../contracts/features/bank/README.md)
- [Transaction History implementation](../../implementation/transaction-history/README.md)
- [Product feature inventory](../README.md)

_[← Back to feature inventory](../README.md)_
