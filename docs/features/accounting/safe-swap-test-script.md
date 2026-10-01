# Safe Asset Exchanges — Manual Validation

Record the build, company, network, reviewer, transaction hashes and result (Pass, Fail, Blocked or Not run).

## External Safe Exchange Checks — Current Runtime

Use a disposable Safe and verified ERC-20 contracts. Do not run test swaps on the production treasury.

1. Record a complete opening history containing 20 USDC in Safe. In **Open in Safe**, exchange those 20 USDC for a different ERC-20. After
   indexing, refresh CNC. The holdings must show that contract's symbol and exact quantity; Accounting must show one `Swap` operation with
   the actual USDC outflow and the acquired token, with no Service Revenue on the swap.
2. Sell the entire acquired quantity for a recorded USDC amount. Accounting must remove the asset's exact
   $20 carrying amount and
   recognize proceeds minus $20 as `Asset Exchange Gain` or `Asset Exchange Loss`. No acquired-asset carrying
   balance may remain after complete disposal. Repeat with a partial disposal to verify the remaining proportional carrying amount.
3. Reload Accounting and verify the same operations and amounts. Confirm that later current-price changes do not alter acquisition cost.
4. Review an asset with missing valuation, unsupported precision, or missing acquisition history. Preserve its identity and raw movement;
   expect an incomplete notice and no substituted POL price. Check the contract address when symbols are duplicated.
5. Review a same-transaction mint or an ambiguous batch. Expect an explicit classification diagnostic; do not mark the accounts complete or
   interpret a mint as service revenue without further protocol evidence.

The automated exchange, portfolio, and query suites cover these isolated rules. An integrated external-swap product review remains **Not
run**.
