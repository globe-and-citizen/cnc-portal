# Client Utility Boundaries

`app/src/utils` owns deterministic data shaping for the Vue client. Every production TypeScript file belongs to a named domain directory;
there is no global `@/utils` barrel.

## Domain Map

| Directory            | Responsibility                                                         |
| -------------------- | ---------------------------------------------------------------------- |
| `accounting/`        | Ledger construction, classification, grouping, and report shaping      |
| `claims/`            | Daily-claim form rules and claim-history navigation                    |
| `communityCredit/`   | Credit offer, round, whitelist, and wizard models                      |
| `contracts/`         | ABI decoding plus contract deployment and action presentation          |
| `currency/`          | Currency display models                                                |
| `dates/`             | Calendar and date-picker calculations                                  |
| `errors/`            | HTTP and contract-error classification                                 |
| `expenses/`          | Expense-account models and limits                                      |
| `files/`             | File-type presentation                                                 |
| `format/`            | Canonical display formatting                                           |
| `investors/`         | Investor mint allocation                                               |
| `paymentGate/`       | Payment Gate calldata shaping                                          |
| `safe/`              | Safe transaction and transfer models                                   |
| `safeDepositRouter/` | Safe Deposit Router models                                             |
| `teams/`             | Team navigation, search, and treasury shaping                          |
| `tokens/`            | Token metadata and unit conversion                                     |
| `transactions/`      | Transaction event, history, registry, and presentation transformations |
| `vesting/`           | Vesting schedule and display models                                    |
| `wages/`             | Wage duration and rate models                                          |
| `wallet/`            | Wallet address and signer shaping                                      |

## Dependency Contract

- Import the owning module explicitly, for example `@/utils/transactions/history`.
- Utilities may depend on types, constants, generated artifacts, pure third-party helpers, and other utility modules when the dependency
  graph stays acyclic.
- Pinia access and reactive state belong in `composables/`.
- API calls and server state belong in `queries/`; contract reads and writes belong in the established contract composables.
- Browser, SDK, logging, and file-export effects belong in `lib/` or a focused composable.
- Specs live in the owning domain's `__tests__/` directory.

Run `npm run lint:utilities` from `app/` to reject flat utility files, legacy `*Util.ts` names, the global barrel, forbidden runtime
dependencies, browser or HTTP I/O, and runtime import cycles.

The canonical architectural description is [Client Utilities](../../../docs/implementation/client-utilities/README.md).
