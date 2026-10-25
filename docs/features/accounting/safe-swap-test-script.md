# Safe Asset Exchanges — Manual Validation

Record the build, company, network, reviewer, transaction hashes and result (Pass, Fail, Blocked or Not run).

## External Safe Exchange Checks — Current Runtime

Use a disposable Safe and verified ERC-20 contracts. Do not run test swaps on the production treasury.

1. Record a complete opening history containing 20 USDC in Safe. In **Open in Safe**, exchange those 20 USDC for a different ERC-20. After
   indexing, refresh CNC. The holdings must show that contract's symbol and exact quantity; Accounting must show one `Swap` operation with
   the actual USDC outflow and the acquired token, with no Service Revenue on the swap. Verify the receipt's rate against the contract's
   historical CoinGecko USD snapshot for that UTC date. Its debit must equal its exact quantity times that recorded rate. If the receipt is
   worth $18, the swap must debit the asset $18 and `Asset Exchange Loss` $2, and credit USDC $20; it must not increase the receipt's rate.
2. Sell the entire acquired quantity for a recorded USDC amount. Accounting must remove the asset's exact historical-market acquisition
   carrying amount and recognize proceeds minus that amount as `Asset Exchange Gain` or `Asset Exchange Loss`. No acquired-asset carrying
   balance may remain after complete disposal. Repeat with a partial disposal to verify the remaining proportional carrying amount.
3. Exchange through CoW Protocol and note the fee the Safe's swap overview shows under **Transaction fees**. Accounting must show the same
   fee as `Transaction Fee Expense` in that `Swap` operation, and the exchange gain or loss must exclude it.
4. Reload Accounting and verify the same operations and amounts. Confirm that later current-price changes do not alter acquisition cost.
5. Review an asset with missing valuation, unsupported precision, or missing acquisition history. Preserve its identity and raw movement;
   expect an incomplete notice and no substituted POL price. Check the contract address when symbols are duplicated.
6. Review a same-transaction mint or an ambiguous batch. Expect an explicit classification diagnostic; do not mark the accounts complete or
   interpret a mint as service revenue without further protocol evidence.

The automated exchange, portfolio, and query suites cover these isolated rules. An integrated external-swap product review remains **Not
run**.
