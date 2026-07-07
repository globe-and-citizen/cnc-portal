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
 * Memo-only entries (an `InvestorV1 Minted` with no backing deposit/withdraw —
 * "Default D", spec §4) carry `debit === credit === null` and `amountUsd === 0`;
 * they only record a share-count change, not money.
 */
import { getAddress, isAddress, type Address } from 'viem'
import type { TokenId } from '@/constant'
import type { AccountName } from './chartOfAccounts'

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
  /** Wage earned — accrual booked when the weekly claim is submitted. */
  | 'UC-CASH-02'
  /** Wage withdrawal settlement (cash leg and/or share leg). */
  | 'UC-CASH-03'
  /** Approved member expense payout. */
  | 'UC-EXP-01'
  /** Dividend paid to a shareholder. */
  | 'UC-INV-01'
  /** Direct SHER mint with no backing deposit/withdraw — memo only, value 0. */
  | 'DEFAULT-D'
  /** Fee skim Bank → FeeCollector — internal move, not an expense (spec §5.1). */
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
  /** Account debited. `null` only for memo-only Default-D entries. */
  debit: AccountName | null
  /** Account credited. `null` only for memo-only Default-D entries. */
  credit: AccountName | null
  /** Absolute USD amount. `0` for memo-only entries. */
  amountUsd: number
  /** Token actually moved on-chain (for audit / display). */
  token: TokenId
  /** Raw on-chain amount in the token's base units (stringified bigint). */
  rawAmount: string
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
   * 1 Daily, 2 Weekly, 3 Monthly, 4 Custom. Set only when the payout was matched
   * to an approved budget, so the Activity narration can adapt: a one-time
   * approval reads the approved amount, a recurring one the remaining balance.
   */
  expenseFrequencyType?: number
  /** Approved budget cap in USD behind a UC-EXP-01 payout, when matched to a budget. */
  expenseApprovedUsd?: number
  /**
   * Budget remaining in USD within the approval's current period **after** this
   * withdrawal — recurring approvals only (a one-time approval is single-use, so
   * no remaining is reported). Reconstructed from the approval and its prior draws,
   * never from the Expense pocket balance, so historical entries stay accurate.
   */
  expenseRemainingUsd?: number
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
  fields: Omit<LedgerEntry, 'internal' | 'enrichment' | 'counterparty'> &
    Partial<Pick<LedgerEntry, 'internal' | 'enrichment'>> & {
      counterparty?: Address | string | null
    }
): LedgerEntry {
  const { counterparty, internal = false, enrichment = 'not-applicable', ...rest } = fields
  const normalized = normalizeCounterparty(counterparty)
  return {
    ...rest,
    internal,
    enrichment,
    ...(normalized ? { counterparty: normalized } : {})
  }
}
