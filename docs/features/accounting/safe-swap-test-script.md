# Safe Asset Exchanges — Manual Validation

Record the build, company, network, reviewer, transaction hashes and result (Pass, Fail, Blocked or Not run).

## External Safe Exchange Checks — Current Runtime

Use a disposable Safe and verified ERC-20 contracts. Do not run test swaps on the production treasury.

1. Record a complete opening history containing 20 USDC in Safe. In **Open in Safe**, exchange those 20 USDC for a different ERC-20. After
   indexing, refresh CNC. The holdings must show that contract's symbol and exact quantity; Accounting must show one `Swap` operation with
   the actual USDC outflow and the acquired token, with no Service Revenue on the swap. For a verified $1 fee, acquired cost must be $19 and
   Transaction Fee Expense $1; together they equal the $20 spent. Received token units remain unchanged. If current market value is
   $18,
   Wallet overview must show $19 net cost, $1 swap fees and -$2 total P&L. Today's Trial Balance must show the same asset cost and
   expense; its live reconciliation shows -$1 unrealized P&L. No acquired-asset market reference or separate Asset Exchange Loss is
   required.
2. Sell the entire acquired quantity for a recorded USDC amount. Accounting must remove the asset's exact executed-consideration acquisition
   carrying amount. Preserve actual net USDC receipts, separate the sale fee expense and recognize gross proceeds minus carrying cost as
   `Asset Exchange Gain` or `Asset Exchange Loss`. Net proceeds minus carrying cost is the net sale result. No acquired-asset carrying
   balance may remain after complete disposal. Repeat with a partial disposal to verify the remaining proportional carrying amount.
3. Reload Accounting and verify the same operations and amounts. Confirm that later current-price changes do not alter acquisition cost.
4. Review a crypto-to-crypto swap: only its outgoing consideration needs a USD rate, the daily rate of its transaction date; its received
   asset keeps that fixed cost less any verified fee. A missing required rate, unsupported precision, or missing acquisition history must
   preserve identity and raw movement but show incomplete status, with no substituted POL price. Check the contract address when symbols are
   duplicated.
5. Review a same-transaction mint or an ambiguous batch. Expect an explicit classification diagnostic; do not mark the accounts complete or
   interpret a mint as service revenue without further protocol evidence.
6. For an already executed Polygon CoW swap, inspect **Safe Account → Wallet overview**. Swap fees replace the separate realized/unrealized
   cards and load without opening any detail panel. In **Activity → Swap costs**, each swap shows its fee total and **Already included in
   your swap** without opening details. **What makes up this fee?** and **Network transaction details** must start closed, including on
   later pages and after switching swaps. Expand the breakdown and verify its short fee explanations. **Show exact amounts** reveals full
   precision and token addresses; switching back restores rounded values. Network gas stays visible separately and distinguishes payment by
   the Safe, another wallet or an unavailable payer; transaction details retain the full hash and known payer. On the same General Ledger
   operation, verify that the principal debit appears first, followed by Transaction Fee Expense, then the credit; the Transaction column
   shows only the entry label, with no **Execution details** or **Swap fees** disclosure. Compare exact amounts and original currencies. The
   total comes from the executed order, while protocol lines are included details, not additional charges. Network gas shows the entire
   settlement's native-token amount and transaction sender; solver gas must not become a Safe expense. Journal debits, credits, net
   acquisition cost and P&L must remain identical before and after opening the panel once fee evidence has loaded. For the recorded
   532.944250 USD purchase with 3.870494 USD fees, net asset cost is 529.073756 USD. At a 530 USD market value, total P&L is -2.944250 USD,
   not that result minus fees again.
7. Compare provider evidence with the receipt's Safe owner, token pair, amounts, block, transaction and log index. An order filled in other
   transactions must not assign its cumulative total to this one swap. An unsupported provider, missing evidence or mismatched records must
   show unavailable rather than zero. The swap then keeps its fee inside the acquired asset cost (532.944250 USD in the example), shows no
   Transaction Fee Expense line, Accounting stays complete and total P&L is unchanged. A provider failure offers retry and retains
   receipt-derived network gas. An explicitly reported zero fee may display zero. No new swap or wallet signature is needed to inspect
   existing evidence.

The automated exchange, portfolio, and query suites cover these isolated rules. An integrated external-swap product review remains **Not
run**.
