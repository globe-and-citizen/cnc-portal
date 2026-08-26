/**
 * The normalized accounting record the source mappers produce.
 *
 * A {@link LedgerEntry} is a **single balanced double-entry posting** — one debit
 * account and one credit account for the same USD amount — derived from a raw
 * indexed on-chain event (catalogue §5 / spec §4). A source event that needs more
 * than two legs (e.g. a wage withdrawal that settles cash *and* mints shares) is
 * emitted as several entries, one balanced pair each, so the trial balance always
 * balances by construction.
 *
 * A memo-only entry (no monetary legs) carries `debit === credit === null` and
 * `amountUsd === 0`, recording only a share-count change, not money.
 */
import { getAddress, isAddress, type Address } from 'viem'
import type { TokenId } from '@/constant'
import type { AccountName } from './chartOfAccounts'
import type { ClassificationCategory } from './classification'

/**
 * The use case (catalogue §5 / spec §4) a ledger entry realises. The `UC-*`
 * codes match the money-flow catalogue; the lowercase codes cover moves the
 * catalogue treats specially (internal pocket-to-pocket moves and fee skims).
 */
export type UseCase =
  /** Founder deposit into a treasury pocket → Owner Capital. */
  | 'UC-BANK-01'
  /** Client payment into a treasury pocket → Service Revenue. */
  | 'UC-BANK-02'
  /** Fund payroll/expense pockets from Bank — internal move. */
  | 'UC-BANK-03'
  /** Invest via SafeDepositRouter → SHER mint (cash lands in Safe). */
  | 'UC-SDR-01'
  /** A team member funds the Safe to invest & get SHER — booked as a capital
   *  contribution (Cr Investor Equity) when no SafeDepositRouter event is present. */
  | 'UC-MEMBER-01'
  /** A lender funds a Community Credit offer → the team borrows (Cr Loan Payable). */
  | 'UC-CREDIT-01'
  /** A fully (or partially) funded offer sweeps its principal to Bank — internal move. */
  | 'UC-CREDIT-02'
  /** Repayment installment pushed to a lender — principal leg and/or interest leg. */
  | 'UC-CREDIT-03'
  /** Principal refunded to a lender when an offer missed its funding target. */
  | 'UC-CREDIT-04'
  /** The flat fixed return a funded round owes its lenders, recognised the moment
   *  it funds — the contract never prorates it (no on-chain event). */
  | 'UC-CREDIT-05'
  /** Wage earned — accrual booked when the weekly claim is submitted. */
  | 'UC-CASH-02'
  /** Wage withdrawal settlement (cash leg and/or share leg). */
  | 'UC-CASH-03'
  /** Approved member expense payout. */
  | 'UC-EXP-01'
  /** Dividend paid to a shareholder. */
  | 'UC-INV-01'
  /** Direct SHER mint: issue shares into equity — Dr SHERS To Be Issued · Cr Investor Equity. */
  | 'DEFAULT-D'
  /** Bank protocol fee skimmed to the FeeCollector — a Transaction Fee Expense. */
  | 'FEE'
  /** Generic internal pocket-to-pocket move (funding deposits, owner sweeps). */
  | 'INTERNAL'
  /** Plain cash inflow not otherwise classified. */
  | 'CASH-IN'
  /** Plain cash outflow not otherwise classified. */
  | 'CASH-OUT'

/**
 * Whether an entry has been joined to its off-chain context (the portal
 * `Wage`/`Claim`/`Expense` records). `not-applicable` is the default for entries
 * that need no join (deposits, internal moves, dividends, …); `needs-off-chain-data`
 * flags a payroll/expense entry that found no matching portal record.
 */
export type EnrichmentStatus = 'enriched' | 'not-applicable' | 'needs-off-chain-data'

export interface LedgerEntry {
  /** Stable id — the source row id, suffixed when one event yields several entries. */
  id: string
  /** Event time, Unix seconds (from the indexed event). */
  timestamp: number
  /** The journal template this entry realises. */
  useCase: UseCase
  /** Account debited. `null` only for memo-only entries (no monetary legs). */
  debit: AccountName | null
  /** Account credited. `null` only for memo-only entries (no monetary legs). */
  credit: AccountName | null
  /**
   * The pocket **contract instance** holding the debited cash (checksum address).
   * Set only on a cash-pocket debit leg: it lets the trial balance split one pocket
   * across redeploys — a team that redeploys its Bank shows `Cash — Bank` (up to the
   * redeploy) and `Cash — Bank #2` (the new deposits) as separate lines. Presentation
   * metadata only: every roll-up (summary, income statement, balance sheet) keys off
   * the base {@link debit} account, so totals are unchanged.
   */
  debitInstance?: Address
  /** The pocket contract instance holding the credited cash — see {@link debitInstance}. */
  creditInstance?: Address
  /** Absolute USD amount. `0` for memo-only entries. */
  amountUsd: number
  /** Token actually moved on-chain — the entry's currency (spec §2 "Devise"). */
  token: TokenId
  /** Raw on-chain amount in the token's base units (stringified bigint). */
  rawAmount: string
  /**
   * USD-per-whole-token rate of record at the transaction time (spec §2 "Taux"),
   * stored at 6-dp precision: `1.000000` for USD-pegged stablecoins, the
   * timestamped price for native (POL) / SHER. `amountUsd = Quantité × rate`.
   * Absent on entries produced before a rate resolver has run (e.g. raw mapper
   * output in unit tests); the consolidation layer fills it in for every entry.
   */
  rate?: number
  /** The other party of the move (checksum address), when there is one. */
  counterparty?: Address
  /** True when both sides are CNC-owned pockets — an internal move (no IS impact). */
  internal: boolean
  /** The contract that emitted the source event (the pocket), when known. */
  contract?: Address
  /** Transaction hash, when known. */
  txHash?: string
  /**
   * The EOA that signed the transaction behind an internal transfer (resolved
   * from {@link txHash}), i.e. the person who performed the move. Transfer-only.
   */
  initiator?: Address
  /** Human-readable memo. */
  memo: string
  /** Share count for equity / Default-D entries (whole SHER, not base units). */
  shares?: number
  /**
   * The Community Credit round (`FixedReturn` offer id) a `UC-CREDIT-*` posting
   * belongs to. What lets a lender's principal and their fixed return be rendered
   * as one compound posting (see {@link ./creditGrouping}) without confusing two
   * rounds the same member lent into.
   */
  creditOfferId?: string
  /**
   * What the whole round still owes its lenders — principal plus recognised fixed
   * return — **after** this posting. Carried on the repayment and refund legs
   * (`UC-CREDIT-03` / `UC-CREDIT-04`), where it lets the journal say how much an
   * installment gave back and how much is left, rather than only naming the
   * amount that just moved. `0` once the round is settled.
   */
  creditRemainingUsd?: number
  /**
   * Minutes worked behind a payroll entry (UC-CASH-02 / UC-CASH-03), carried from
   * the weekly claim so the human-readable label can read "submitted 16h". Absent
   * for non-payroll entries.
   */
  minutesWorked?: number
  /**
   * End of the work week a wage accrual covers (Unix seconds), carried from the
   * weekly claim so the label can read "week ending Jun 14". Accrual-only.
   */
  periodEnd?: number
  /** Accounting category attached during off-chain enrichment (e.g. "Payroll"). */
  category?: string
  /**
   * The expense approval's frequency behind a UC-EXP-01 payout — 0 One-Time,
   * 1 Daily, 2 Weekly, 3 Monthly, 4 Custom. Set only when the payout matched an
   * approved budget; it is what lets the Activity narration adapt.
   */
  expenseFrequencyType?: number
  /** Approved budget cap in USD behind a UC-EXP-01 payout, when matched to a budget. */
  expenseApprovedUsd?: number
  /**
   * Budget left in USD within the approval's current period **after** this
   * withdrawal — recurring approvals only (a one-time one is single-use).
   * Reconstructed from the approval and its prior draws, never from the Expense
   * pocket balance, so historical entries stay accurate.
   */
  expenseRemainingUsd?: number
  /**
   * The Bank protocol fee charged in the **same on-chain transaction** as this
   * transfer, folded in for the general-ledger view only — Dr destination (net) ·
   * Dr Transaction Fee Expense · Cr Cash — Bank (gross). Set by the presenter
   * ({@link mergeBankFees}), never by a mapper: the canonical feed the statements
   * roll up keeps the fee as its own posting, so nothing is double counted.
   */
  mergedBankFee?: {
    amountUsd: number
    /** Raw on-chain amount, in the token's base units. */
    rawAmount: string
    token: TokenId
    /** USD rate of record, when resolved. */
    rate?: number
  }
  /**
   * The manual category a team owner classified the source transaction as
   * (issue #2457), overriding the address inference. Absent means the entry is
   * address-inferred — the visible fallback the UI flags as such. Set only on
   * Bank/Safe deposit/withdrawal entries whose transaction has a classification.
   */
  classified?: ClassificationCategory
  /** Off-chain enrichment status. */
  enrichment: EnrichmentStatus
}

/** Checksum-normalize an address, returning `undefined` for invalid input. */
export function normalizeCounterparty(
  address: Address | string | null | undefined
): Address | undefined {
  if (!address || !isAddress(address)) return undefined
  return getAddress(address)
}

/**
 * Build a {@link LedgerEntry}, filling the common defaults
 * (`internal: false`, `enrichment: 'not-applicable'`) so call sites only specify
 * what differs. `counterparty` is checksum-normalized; nullish/invalid is dropped.
 */
export function makeEntry(
  fields: Omit<
    LedgerEntry,
    'internal' | 'enrichment' | 'counterparty' | 'debitInstance' | 'creditInstance'
  > &
    Partial<Pick<LedgerEntry, 'internal' | 'enrichment'>> & {
      counterparty?: Address | string | null
      /** Cash-pocket instance for the debit leg — checksum-normalized, invalid dropped. */
      debitInstance?: Address | string | null
      /** Cash-pocket instance for the credit leg — checksum-normalized, invalid dropped. */
      creditInstance?: Address | string | null
    }
): LedgerEntry {
  const {
    counterparty,
    debitInstance,
    creditInstance,
    internal = false,
    enrichment = 'not-applicable',
    ...rest
  } = fields
  const normalized = normalizeCounterparty(counterparty)
  const debitAt = normalizeCounterparty(debitInstance)
  const creditAt = normalizeCounterparty(creditInstance)
  return {
    ...rest,
    internal,
    enrichment,
    ...(normalized ? { counterparty: normalized } : {}),
    ...(debitAt ? { debitInstance: debitAt } : {}),
    ...(creditAt ? { creditInstance: creditAt } : {})
  }
}
