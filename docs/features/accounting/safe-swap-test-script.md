# Safe Asset Exchanges — Manual Validation

Record the build, company, network, reviewer, transaction hashes and result (Pass, Fail, Blocked or Not run).

## External Safe Exchange Checks — Current Runtime

Use a disposable Safe and verified ERC-20 contracts. Do not run test swaps on the production treasury.

1. Record a complete opening history containing 20 USDC in Safe. In **Open in Safe**, exchange those 20 USDC for a different ERC-20. After
   indexing, refresh CNC. The holdings must show that contract's symbol and exact quantity; Accounting must show one `Swap` operation with
   the actual USDC outflow and the acquired token, with no Service Revenue and no `Swap P&L` line. The token's debit must equal the
   $20 paid, and its rate must be $20 divided by its exact quantity, whatever the market price of that day.
2. Exchange part of the acquired token for a different non-stablecoin ERC-20. Accounting must move the same proportion of the token's
   carrying amount to the asset received, with no `Swap P&L` line. Exchange the rest to verify that no carrying balance remains for a token
   fully given up.
3. Exchange through CoW Protocol and note the fee the Safe's swap overview shows under **Transaction fees**. For a fee taken in USDC,
   Accounting must show the same fee as `Transaction Fee Expense` in that `Swap` operation, and the acquired token's debit must be the price
   paid less that fee.
4. Reload Accounting and verify the same operations and amounts. Confirm that later current-price changes do not alter the price paid.
5. Sell an acquired token for USDC at a price different from what it cost. Accounting must stay complete: the USDC is debited at its face
   value, the token is credited at its carrying amount, and the difference, less any reported fee, is credited to `Swap P&L` for a gain or
   debited for a loss. The same amount must appear on `Swap P&L` in the Income Statement, the Trial Balance, and the General Ledger.
6. Note the **P&L** of the Safe's Wallet overview, then open Accounting. `Swap P&L` must show the same amount in the Income Statement, the
   Trial Balance, and the General Ledger, where a `Swap P&L revaluation` dated with each swap books it against
   `Safe Market Value Adjustment`. The swap itself and `Cash — Safe` must keep the price paid. Reload both pages: the figure must not change
   until a price moves, and must never drop a fee while it reloads.
7. Review an asset with missing valuation, unsupported precision, or missing acquisition history. Preserve its identity and raw movement;
   expect an incomplete notice and no substituted POL price. Check the contract address when symbols are duplicated.
8. Review a same-transaction mint or an ambiguous batch. Expect an explicit classification diagnostic; do not mark the accounts complete or
   interpret a mint as service revenue without further protocol evidence.

The automated exchange, portfolio, and query suites cover these isolated rules. An integrated external-swap product review remains **Not
run**.
