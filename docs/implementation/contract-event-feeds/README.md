# Contract Event Feeds

**Scope:** Shared client runtime for reconstructing Bank, Expense, Payroll, Community Credit, Investor, Safe Deposit Router, and Vesting
activity directly from on-chain RPC logs.

**Last verified:** 2026-09-05

## Consumers

- [Accounts](../../features/accounts/README.md) uses Bank, Expense Account, and Cash Remuneration activity.
- [Accounting](../../features/accounting/README.md) maps contract activity into the canonical JournalEntry read model.
- [Community Credit](../../features/community-credit/README.md) uses Credit Account activity.
- [Payroll](../../features/payroll/README.md) shows Cash Remuneration activity.
- [Shareholder Management](../../features/shareholder-management/README.md) shows Investor and Safe Deposit Router activity.

## Runtime Model

```mermaid
flowchart LR
  history[Officer contract history] --> bankTargets[Bank generation targets]
  contracts[Contract event logs] --> scan[useContractEventsViaLogs]
  bankTargets --> scan
  scan --> feeds[Source-neutral contract event feeds]
  feeds --> histories[Transaction histories]
  feeds --> accounting[Accounting assembly]
```

## Main Flow

1. A domain feed selects the relevant contract address or generation targets.
2. `useContractEventsViaLogs` fetches and decodes the relevant logs, then resolves their block timestamps.
3. The domain mapper returns its source-neutral event feed for a transaction history or Accounting assembly.
4. Incoming Bank token transfers use every known Officer-generation Bank target, so a later Bank deployment does not hide prior transfers.

## Invariants and Failure Behaviour

- RPC logs are the only client-side source for these contract event feeds.
- A decoded event has the stable identity `<txHash>-<logIndex>`; duplicate scans collapse on that identity.
- Contract generations scan from their deployment boundary whenever it is known.
- A failed generation scan leaves the remaining generations available and records a scan gap for consumers that surface reconciliation
  state.
- The current Bank remains a fallback target for companies without Officer history.

## Implementation Evidence

**Implementation evidence reviewed against:** `a48a6e36a123718e2fa2cb73fd89425c57807c68`

- [Shared RPC log scanner](../../../app/src/composables/eventsViaLogs.ts)
- [Bank event feed](../../../app/src/composables/bank/useBankEventsViaLogs.ts) and
  [incoming Bank transfer feed](../../../app/src/composables/bank/useIncomingBankTokenTransfersViaLogs.ts)
- [Expense event feed](../../../app/src/composables/expense/useExpenseEventsViaLogs.ts) and
  [Cash Remuneration event feed](../../../app/src/composables/cashRemuneration/useCashRemunerationEventsViaLogs.ts)
- [Fixed Return event feed](../../../app/src/composables/fixedReturn/useFixedReturnEventsViaLogs.ts)
- [Investor event feed](../../../app/src/composables/investor/useInvestorEventsViaLogs.ts) and
  [Safe Deposit Router event feed](../../../app/src/composables/investor/useSafeDepositRouterEventsViaLogs.ts)
- [Vesting event feed](../../../app/src/composables/vesting/useVestingEventsViaLogs.ts)
- [Bank-generation target tests](../../../app/src/composables/bank/__tests__/useIncomingBankTokenTransfersViaLogs.spec.ts) and
  [shared scanner tests](../../../app/src/composables/__tests__/eventsViaLogs.spec.ts)

## Related Documentation

- [Transaction History](../transaction-history/README.md)
- [Accounting Read Model](../accounting-read-model/README.md)
- [Client Data Access](../client-data-access/README.md)
