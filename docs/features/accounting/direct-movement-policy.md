# Direct Asset Movements — Product Contract

**Status:** Target product behaviour; implementation and human validation remain pending

This policy defines the coverage of [US-ACCT-007–010](README.md#us-acct-007-review-direct-treasury-movements). It applies to movements made
outside the portal as well as movements made through a contract action. Source domains own their actions and available balances; Accounting
owns discovery, classification, reconciliation, and the shared movement identity. Delivery is tracked in
[#2878](https://github.com/globe-and-citizen/cnc-portal/issues/2878).

## Company Boundary and Asset Scope

- Inventory every registered current and historical company deployment, its chain, effective deployment boundary, and evidenced custody
  relationship. Include the registered Safe and company-specific contracts even when their normal purpose is not treasury management.
- Registration identifies a candidate address. Verify the company's custody or economic claim before including its balance in company books.
  Shared infrastructure, another company's contract, and personal wallets are not company assets merely because they interact with the
  company. Unresolved attribution remains visible and prevents a complete-coverage claim.
- Record ordinary successful native receipts where the contract accepts them, and ERC-20 transfers that change the destination's balance. A
  plain ERC-20 transfer need not call the receiving contract, invoke its support checks, or emit its business event. A rejected native send
  creates no receipt. Forced native balance changes require sufficient chain evidence; otherwise report an unexplained difference.
- Preserve historical tokens after support removal. Distinguish a known valued asset, a known asset awaiting valuation, and an unsolicited
  asset outside the recognized catalogue. Never invent token metadata, USD value, or a zero balance for an unsupported read.
- Token balance, recognized company asset, and amount available to spend or recover are distinct outcomes. A deposit does not grant a new
  withdrawal method, bypass authorization, fund an unrelated obligation, or prove recoverability. Show any restriction or unknown recovery
  status. Own-company SHER and NFTs must not be treated as ordinary cash merely because a transfer was discovered; keep their quantities and
  explicit exclusion from cash valuation until a dedicated accounting policy applies.

## Contract and Domain Coverage

The current-code observations below come from source inspection, not a deployed transaction replay. Native acceptance describes the current
Solidity receiver; historical deployments must be checked against their own version. ERC-20 acceptance depends on the token.

| Address / domain                                                                       | Current direct-receipt behaviour                                                                                                                                                                                                    | Target observable result / canonical owner                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bank                                                                                   | Native `receive()` emits `Deposited`; `depositToken()` emits `TokenDeposited`. Plain ERC-20 transfers are scanned for historically added tokens in Bank history, but the raw rows are absent from Accounting assembly.              | Funding and history in [US-BANK-001](../accounts/README.md#us-bank-001-fund-the-bank) / [003](../accounts/README.md#us-bank-003-review-the-bank-position-and-history), with the same movement in Accounting.                                                                                     |
| Safe                                                                                   | Incoming transfers come from the Safe service. Outgoing Accounting evidence recognizes selected executed transfers; arbitrary calls, modules, and MultiSend are not complete movement discovery.                                    | [US-SAFE-002](../accounts/README.md#us-safe-002-inspect-safe-details) exposes actual asset movements independently of proposal/signature history.                                                                                                                                                |
| Payroll / CashRemuneration                                                             | Native `receive()` emits `Deposited`. Plain ERC-20 receipts emit no Payroll deposit event; the supplemental feed only reads Bank-origin transfers. The native deposit mapper assumes internal funding.                              | [US-PAYROLL-003](../payroll/README.md#us-payroll-003-fund-the-payroll-contract) / [013](../payroll/README.md#us-payroll-013-review-the-payroll-account-position) distinguish funding, claim eligibility, and external-receipt classification.                                                    |
| Expense Account                                                                        | Native receipts and `depositToken()` emit deposit events. Plain ERC-20 receipts bypass both; the supplemental feed only reads Bank-origin transfers. Deposit mapping assumes internal funding.                                      | [US-EXP-005](../accounts/README.md#us-exp-005-fund-the-expense-account) / [004](../accounts/README.md#us-exp-004-review-the-expense-account-and-its-history) distinguish funding, spending eligibility, and external-receipt classification.                                                     |
| FixedReturn / Community Credit                                                         | No plain native receiver. ERC-20 can arrive without `lendFunds()` or a round event. Round balances and obligations are driven by business calls.                                                                                    | [US-CC-001](../community-credit/README.md#us-cc-001-inspect-the-credit-account) exposes unallocated contract movements separately from round funding, lender positions, repayments, and refunds.                                                                                                 |
| Investor / Shareholder                                                                 | Native `receive()` accepts funds without a deposit event. ERC-20 can arrive directly. Dividend and mint feeds do not discover arbitrary receipts.                                                                                   | [US-SHER-003](../shareholder-management/README.md#us-sher-003-review-shareholder-position-and-activity) exposes held assets separately from share ownership and executed distributions.                                                                                                          |
| SafeDepositRouter / Shareholder                                                        | No plain native receiver. A regular `deposit()` transfers ERC-20 directly to Safe and mints SHER. ERC-20 sent to the Router itself mints nothing; owner-only `recoverERC20()` sends those tokens to Safe.                           | [US-SHER-003](../shareholder-management/README.md#us-sher-003-review-shareholder-position-and-activity) distinguishes accidental custody and recovery from the investment in [US-SHER-001](../shareholder-management/README.md#us-sher-001-invest-in-the-safe-and-receive-sher).                 |
| AdCampaignManager / Campaigns                                                          | Native `receive()` accepts funds without creating a campaign or increasing a recorded budget. ERC-20 can arrive but campaign operations handle native budgets.                                                                      | [US-CONTRACT-003](../contract-management/README.md#us-contract-003-manage-advertising-campaigns) exposes unallocated holdings separately from campaign budgets and claimed spend.                                                                                                                |
| Vesting                                                                                | No plain native receiver. ERC-20 can arrive; grant and release calls manage SHER issuance rather than allocating unsolicited token balances.                                                                                        | [US-VESTING-002](../vesting/README.md#us-vesting-002-view-schedules-and-aggregate-totals) separates direct holdings from schedules and claimable compensation.                                                                                                                                   |
| Officer, BoardOfDirectors, Elections, Proposals, and legacy company Voting deployments | The current listed governance contracts have no plain native receiver. Standard ERC-20 transfers can still target their addresses without a domain event or recovery method. Legacy capabilities require version-specific evidence. | [US-CONTRACT-001](../contract-management/README.md#us-contract-001-review-the-current-contract-suite) and [004](../contract-management/README.md#us-contract-004-review-deployment-history) expose attributed holdings, history, and recovery limitations; no new governance action is inferred. |
| Shared FeeCollector, factories, beacons, implementation contracts                      | FeeCollector accepts plain native funds without `FeePaid` and can hold ERC-20. Shared infrastructure addresses can also be token recipients. They are not company custody merely because the company uses them.                     | Exclude shared balances from company cash. An evidenced company fee follows `RULE-FEE`; an unrelated receipt is not a company fee or revenue. Platform treasury/recovery is outside this company-books contract.                                                                                 |
| Payment Gate                                                                           | The widget pays the configured Bank; it is not an additional custody contract. Invoice history requires decodable facture evidence.                                                                                                 | [US-PAYGATE-004](../payment-gate/README.md#us-paygate-004-review-payment-history) keeps unmatched Bank receipts out of invoice history while Bank and Accounting retain the movement.                                                                                                            |

## Economic Classification

1. Resolve chain evidence and custody at the movement's date before selecting an economic use case. Missing attribution is an explicit gap.
2. Use an established domain operation first: investment with issued shares, credit subscription or repayment, wages, approved spending,
   dividends, or campaign activity. A raw transfer is additional evidence for that operation, not another accounting operation.
3. A remaining movement between verified company holdings uses
   [UC-TREASURY-001](journal-entry-catalogue.md#uc-treasury-001--internal-company-pocket-transfer). Recovery from Router to Safe is internal
   when both balances belong to the same company. A recovery does not retroactively establish why the original receipt occurred.
4. A remaining external receipt uses [UC-TREASURY-002](journal-entry-catalogue.md#uc-treasury-002--external-receipt-pending-classification):
   debit the receiving asset account, credit `Unclassified Receipts` until reliable purpose evidence or the owner's eligible classification
   applies. The sender being a founder or member is not evidence of revenue or capital.
5. A remaining external payment uses [UC-TREASURY-003](journal-entry-catalogue.md#uc-treasury-003--external-payment-pending-classification).
   Balance reconciliation never creates a balancing entry to hide an unexplained difference.

Existing Bank, Safe, Payroll, Expense, and Credit asset families retain their identities. For other verified company holdings, the target
uses a distinct deployment-scoped `Assets — Other company contracts` account, with the original asset and quantity retained. It must not be
resolved to Bank or Safe merely to satisfy the existing chart. Restricted holdings remain identifiable; unknown ownership or asset policy
remains incomplete rather than becoming a fabricated asset entry. This new account family is not implemented.

Business evidence that exists but lacks a canonical posting rule remains an explicit accounting gap. In particular, this policy does not
define complete campaign escrow recognition or change the timing of Credit subscription accounting. Do not force known business activity
into suspense or claim those full lifecycles are covered by direct-receipt rules.

## Receipt Classification and Historical Entries

[US-ACCT-010](README.md#us-acct-010-classify-direct-external-receipts) owns the policy. Only the company owner configures a default or
classifies an eligible receipt. Without an explicit automatic policy, new unidentified receipts remain pending. Automatic defaults are
limited to `Service Revenue`, `Owner Capital`, and `Loan Payable`; suspense remains available for review. A selected account classifies the
receipt but does not create a protocol loan, mint shares, allocate a campaign budget, or change the sending wallet's rights. Router-backed
investment and other specific domain operations are ineligible for this fallback. Cash accounts, expense accounts, and share-issuance
accounts are not eligible receipt defaults.

Keep already posted classifications unchanged when enabling the new policy. Reclassify a historical eligible receipt only through an
explicit owner action retaining previous account, new account, actor, time, and reason. Discovery of an older previously unrecorded receipt
uses its original transaction date and evidence, with the pending default unless an explicitly applicable policy establishes otherwise.
Changing a policy must not silently rewrite old entries. Reclassification preserves the cash leg, original quantity, valuation evidence, and
movement identity; reports and exports use the same resulting journal version.

## Discovery, Identity, and Completeness

- Ordinary reads reuse a shared verified snapshot. A requested synchronization discovers off-platform activity up to its verified block;
  active-reader notification does not discover activity by itself. A confirmed platform write requests a refresh.
- Preserve individual movement identities within one transaction and link contract events, token transfers, native evidence, and service
  records to those identities. Deduplication by transaction hash or transaction-plus-token alone is insufficient for multiple transfers.
- Every affected domain history and the General Ledger refer to the same evidence. Group compatible postings by source operation without
  losing individual receipts or classification decisions. Repeating synchronization must not post the movement again.
- Compare original asset quantities at the same block for each covered deployment. Retain missing-rate, unsupported-asset, incomplete-scan,
  native-proof, and ownership gaps. A balanced journal alone does not establish complete books.
- Treat a chain revision as invalidating affected evidence and dependent classifications; require a verified replacement snapshot before
  declaring the revised books complete. Keep the audit trail. Unsupported historical state bounds the divergence interval rather than
  supplying an invented exact block.

## Current Evidence and Implementation Boundary

Inspected source revision: `a8801b00140f0a5326c54e7f8825375acb44245c`. Receiver and economic-call evidence:
[Bank](../../../contract/contracts/Bank.sol), [Payroll](../../../contract/contracts/CashRemunerationEIP712.sol),
[Expense](../../../contract/contracts/expense-account/ExpenseAccountEIP712.sol), [FixedReturn](../../../contract/contracts/FixedReturn.sol),
[Investor](../../../contract/contracts/Investor/Investor.sol), [Router](../../../contract/contracts/SafeDepositRouter.sol),
[Campaign](../../../contract/contracts/AdCampaignManager.sol), [Vesting](../../../contract/contracts/Vesting.sol),
[FeeCollector](../../../contract/contracts/FeeCollector.sol), and [company contract types](../../../app/src/types/teamContract.ts).

The [current assembly](../../../app/src/utils/accounting/assemble.ts),
[deployment account resolver](../../../app/src/utils/accounting/accountInstances.ts), and
[incoming Bank transfer feed](../../../app/src/composables/bank/useIncomingBankTokenTransfersViaLogs.ts) do not implement this complete
contract. The [read-model documentation](../../implementation/accounting-read-model/README.md) describes current architecture and the target
boundary. New ACs remain unchecked; the [manual validation script](accounting-test-script.md#direct-movement-coverage) records the future
representative checks.
