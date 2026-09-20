# Transaction History

**Scope:** Shared client-side filtering, pagination, and transaction-detail presentation for account, credit, and shareholder histories.

**Last verified:** 2026-08-30

## Consumers

- [Accounts](../../features/accounts/README.md) uses Bank, Expense Account, and Cash Remuneration transaction histories.
- [Community Credit](../../features/community-credit/README.md) uses the Credit Account transaction history.
- [Shareholder Management](../../features/shareholder-management/README.md) uses investor transaction history.
- [Payment Gate](../../features/payment-gate/README.md) reuses the transaction-detail slide-over for payment history.
- [Elections](../../features/elections/README.md) reuses the route-bound pagination and pager for the past-election archive.

## Runtime Model

```mermaid
flowchart LR
  views[Feature views] --> histories[Transaction history sections]
  histories --> dateFilter[DatePicker range filter]
  histories --> tableState[useTransactionTable]
  tableState --> pagination[Route-bound pagination]
  pagination --> pager[TablePagination]
  tableState --> rows[Filtered grouped rows]
  rows --> detail[TransactionDetailSlideover]
```

## Invariants and Failure Behaviour

- History sections retain ownership of their query data; `useTransactionTable` only derives filtered, grouped, and paginated rows.
- Contract activity reaches history sections through the shared RPC-log feeds; table filtering does not choose or replace that source.
- History sections bind the shared `DatePicker` directly to a `{ start, end } | undefined` range. Their stable storage keys and date-filter
  test selectors are retained.
- Page and page size live in the route query, so a paginated view is shareable and survives a reload; several paginated lists can share one
  route under distinct query keys.
- The pager offers only the page sizes its owner allows; a list held in memory that shrinks below the page the URL names falls back to its
  last remaining page rather than showing an empty one.
- A date or type-filter change resets the page and collapses expanded rows without reacting to query refreshes.
- A selected row opens its detail in `TransactionDetailSlideover`; closing it does not alter the applied filters.
- Date-range selection is documented by the [Date Picker capability](../date-picker/README.md).

## Implementation Evidence

**Implementation evidence reviewed against:** `7acc3be8ba3462eca7dcbc464357611acc5b3a46`

- [Shared table state](../../../app/src/composables/transactions/useTransactionTable.ts)
- [Route-bound pagination state](../../../app/src/composables/usePagination.ts) and its
  [tests](../../../app/src/composables/__tests__/usePagination.spec.ts)
- [Shared pager control](../../../app/src/components/ui/TablePagination.vue)
- [Bank history](../../../app/src/components/sections/BankView/BankTransactions.vue),
  [Expense Account history](../../../app/src/components/sections/ExpenseAccountView/ExpenseTransactions.vue), and
  [Cash Remuneration history](../../../app/src/components/sections/CashRemunerationView/CashRemunerationTransactions.vue)
- [Credit Account history](../../../app/src/components/sections/CommunityCreditView/CreditAccountTransactions.vue) and
  [investor history](../../../app/src/components/sections/SherTokenView/InvestorsTransactions.vue)
- [Shared transaction detail slide-over](../../../app/src/components/ui/TransactionDetailSlideover.vue)

## Related Documentation

- [Date Picker](../date-picker/README.md)
- [Contract Event Feeds](../contract-event-feeds/README.md)
- [Client Navigation](../client-navigation/README.md)
