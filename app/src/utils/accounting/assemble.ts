/**
 * Pure assembly of a team's CNC accounting (issue #2118, the data layer's core).
 *
 * The composable {@link useCNCAccounting} fetches the raw feeds — Ponder contract
 * events, the team's Safe incoming transfers and the portal DB rows — and hands
 * them to this **pure** function. Keeping the adaptation + statement build here
 * (rather than inside the composable) means the whole pipeline is unit-testable
 * with hand-built sample data, no Vue or network mocks required (same philosophy
 * as the source mappers, spec §2).
 *
 * Pipeline (spec §2):
 *   raw feeds → {@link LedgerSources} + {@link MapperContext} + enrichment
 *             → buildCncLedgerEntries (#2113 mappers + off-chain join)
 *             → buildLedger (#2117 consolidation: dedupe twins + summary)
 *             → buildJournal (validated canonical journal)
 *             → General Ledger / Trial Balance; legacy statement projections
 */
import { type Address } from 'viem'
import type { TeamContract } from '@/types/teamContract'
import type { WeeklyClaim } from '@/types/cash-remuneration'
import type { ExpenseResponse } from '@/types/expense-account'
import type { SafeIncomingTransfer, SafeTransaction } from '@/types/safe'
import type { TransactionClassificationRecord } from '@/types/accounting-classification'
import type { BankEventsQuery } from '@/types/ponder/bank'
import type { CashRemunerationEventsQuery } from '@/types/ponder/cash-remuneration'
import type { ExpenseEventsQuery } from '@/types/ponder/expense'
import type { FixedReturnEventsQuery } from '@/types/ponder/fixedReturn'
import type { InvestorEventsQuery, SafeDepositRouterEventsQuery } from '@/types/ponder/investor'
import type { VestingEventsQuery } from '@/types/ponder/vesting'
import { collectInternalAddresses } from '@/utils/accounting/internalAddresses'
import type { ClassificationOverride } from '@/utils/accounting/classification'
import { buildMapperContext } from '@/utils/accounting/mappers/context'
import type { CreditOfferTerms } from '@/utils/accounting/mappers/creditTimeline'
import { buildCncLedgerEntries, type LedgerSources } from '@/utils/accounting/mappers'
import { buildLedger, type AccountingSummary } from '@/utils/accounting/buildLedger'
import { buildAccountRegistry, type AccountRegistry } from '@/utils/accounting/accountRegistry'
import {
  buildGeneralLedger,
  buildJournal,
  type GeneralLedger,
  type JournalEntry
} from '@/utils/accounting/generalLedger'
import { reconcileJournalEntrySources } from '@/utils/accounting/journalEntry'
import { buildIncomeStatement, type IncomeStatement } from '@/utils/accounting/incomeStatement'
import { buildBalanceSheet, type BalanceSheet } from '@/utils/accounting/balanceSheet'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { tokenUsdRate, type UsdRateOfRecord } from '@/utils/accounting/toUsd'
import {
  buildSherMultiplierTimeline,
  makeSherUsdRate,
  currentSherUsdRate
} from '@/utils/accounting/sherRate'
import { settleWithdrawnSher } from '@/utils/accounting/mappers/sherIssuance'
import { atDate } from '@/utils/accounting/mappers/context'
import { toSafeTransferRows, toSafeOutgoingTransferRows } from '@/utils/accounting/safeTransfers'

/** The raw feeds for one team, as fetched by {@link useCNCAccounting}. */
export interface CncAccountingInput {
  /** The team's `TeamContract` rows — resolve the internal pockets. */
  contracts?: readonly TeamContract[]
  /** The team's Gnosis Safe address — classifies each Safe transfer. */
  safeAddress?: Address | string | null
  /**
   * Legacy FeeCollector address input. It is intentionally ignored: the global
   * protocol treasury is not a company-owned pocket and never joins the internal
   * address registry.
   */
  feeCollectorAddress?: Address | string | null
  /** On-chain SHER token address, so it resolves to the `sher` token id. */
  sherTokenAddress?: Address | string | null
  /** SafeDepositRouter address — its inflows to the Safe are booked from its own
   *  event (UC-SDR-01), so the matching Safe transfer is excluded here. */
  safeDepositRouterAddress?: Address | string | null
  /** Live SHER-per-token multiplier (whole units) read straight from the router,
   *  used to value SHER when there are no `MultiplierUpdated` events (the
   *  constructor's initial multiplier emits none). Defaults to 1x (1 SHER = $1). */
  currentSherMultiplier?: number | null
  /** FX resolver for non-pegged tokens (native, SHER) — see toUsd. */
  rateOfRecord?: UsdRateOfRecord
  // ── raw query results (any may be null: source absent, disabled or failed) ──
  bankEvents?: BankEventsQuery | null
  cashRemunerationEvents?: CashRemunerationEventsQuery | null
  expenseEvents?: ExpenseEventsQuery | null
  fixedReturnEvents?: FixedReturnEventsQuery | null
  /** Rate + maturity per Community Credit offer, read from the contract — what
   *  lets the interest be accrued over the term instead of expensed at payment. */
  fixedReturnOfferTerms?: readonly CreditOfferTerms[] | null
  investorEvents?: InvestorEventsQuery | null
  vestingEvents?: VestingEventsQuery | null
  safeDepositRouterEvents?: SafeDepositRouterEventsQuery | null
  safeTransfers?: readonly SafeIncomingTransfer[] | null
  /** Executed multisig transactions — outflows from the Safe. */
  safeOutgoingTransactions?: readonly SafeTransaction[] | null
  // ── portal DB rows (off-chain enrichment context, spec §3.2) ──
  weeklyClaims?: readonly WeeklyClaim[]
  expenses?: readonly ExpenseResponse[]
  /** Manual Bank/Safe transaction classifications, overriding address inference (#2457). */
  classifications?: readonly TransactionClassificationRecord[] | null
}

/** The transitional posting feed, canonical journal, and report projections a team's books resolve to. */
export interface CncAccounting {
  /**
   * Deduped, chronologically sorted mapper postings. Transitional input for
   * report projections that have not migrated to journal lines yet.
   */
  entries: LedgerEntry[]
  /** The canonical concrete-account source of truth for this assembled book. */
  accountRegistry: AccountRegistry
  /** The validated, ordered double-entry journal built once after consolidation. */
  journal: JournalEntry[]
  /** Roll-up totals for the summary cards. */
  summary: AccountingSummary
  /** Double-entry journal + trial balance. */
  generalLedger: GeneralLedger
  incomeStatement: IncomeStatement
  balanceSheet: BalanceSheet
  /** Fee logs withheld because their Bank outflow counterpart is missing. */
  unmatchedFeeOperationIds: string[]
}

/**
 * Phase-1 default FX resolver. Native (POL/ETH) and SHER have **no historical
 * price feed yet** (spec §6 "FX / price-of-record" is a Phase-2 gap). Rather than
 * throw — which would blank the whole page — we value them at 0 until a price
 * oracle is wired, so stablecoin (USDC) figures still render. Callers can inject
 * a real resolver (e.g. the agreed SHER mint price) via `rateOfRecord`.
 */
export const phase1RateOfRecord: UsdRateOfRecord = () => 0

/** Pull a Ponder query field's `.items`, tolerating a missing/null result. */
function items<T>(field: { items: T[] } | null | undefined): T[] {
  return field?.items ?? []
}

/**
 * Index the manual classifications by their transaction identity so the mapper
 * context can look one up per ledger entry. Keys are lowercased to match the entry
 * ids (`${txHash}-${logIndex}`), guarding against a mixed-case hash from the API.
 */
function toClassificationMap(
  records: readonly TransactionClassificationRecord[] | null | undefined
): Map<string, ClassificationOverride> {
  const map = new Map<string, ClassificationOverride>()
  for (const record of records ?? []) {
    map.set(record.txId.toLowerCase(), { category: record.category, memo: record.memo })
  }
  return map
}

/** Build the {@link LedgerSources} the mappers consume from the raw query results. */
function toLedgerSources(input: CncAccountingInput): LedgerSources {
  const sources: LedgerSources = {}

  if (input.bankEvents) {
    sources.bank = {
      deposits: items(input.bankEvents.bankDeposits),
      tokenDeposits: items(input.bankEvents.bankTokenDeposits),
      transfers: items(input.bankEvents.bankTransfers),
      tokenTransfers: items(input.bankEvents.bankTokenTransfers)
    }
    sources.fees = {
      bankFeePaids: items(input.bankEvents.bankFeePaids)
    }
  }

  if (input.cashRemunerationEvents) {
    const events = input.cashRemunerationEvents
    sources.cashRemuneration = {
      deposits: items(events.cashRemunerationDeposits),
      withdraws: items(events.cashRemunerationWithdraws),
      withdrawTokens: items(events.cashRemunerationWithdrawTokens),
      ownerTreasuryWithdrawNatives: items(events.cashRemunerationOwnerTreasuryWithdrawNatives),
      ownerTreasuryWithdrawTokens: items(events.cashRemunerationOwnerTreasuryWithdrawTokens)
    }
  }

  if (input.expenseEvents) {
    const events = input.expenseEvents
    sources.expenseAccount = {
      deposits: items(events.expenseDeposits),
      tokenDeposits: items(events.expenseTokenDeposits),
      transfers: items(events.expenseTransfers),
      tokenTransfers: items(events.expenseTokenTransfers),
      ownerTreasuryWithdrawNatives: items(events.expenseOwnerTreasuryWithdrawNatives),
      ownerTreasuryWithdrawTokens: items(events.expenseOwnerTreasuryWithdrawTokens)
    }
  }

  if (input.fixedReturnEvents) {
    const events = input.fixedReturnEvents
    sources.fixedReturn = {
      lendingOfferCreateds: items(events.fixedReturnLendingOfferCreateds),
      lendingOfferFundeds: items(events.fixedReturnLendingOfferFundeds),
      fundsLents: items(events.fixedReturnFundsLents),
      lenderRepaids: items(events.fixedReturnLenderRepaids),
      principalRefundeds: items(events.fixedReturnPrincipalRefundeds),
      ...(input.fixedReturnOfferTerms ? { offerTerms: input.fixedReturnOfferTerms } : {})
    }
  }

  if (input.safeDepositRouterEvents) {
    sources.safeDepositRouter = { deposits: items(input.safeDepositRouterEvents.safeDeposits) }
  }

  if (input.vestingEvents) {
    sources.vesting = {
      createds: items(input.vestingEvents.vestingCreateds),
      releases: items(input.vestingEvents.vestingTokensReleaseds),
      stoppeds: items(input.vestingEvents.vestingStoppeds)
    }
  }

  // The investor mapper correlates each mint with the deposits/withdraws that
  // already booked the equity (catalogue §5.4), so it needs those cross-source
  // rows even when there are no Investor events of its own to map. A vesting
  // release mints through the same Investor `individualMint`, so its rows back the
  // matching mint too (UC-VEST-02), preventing a double-counted Default-D.
  if (
    input.investorEvents ||
    input.safeDepositRouterEvents ||
    input.cashRemunerationEvents ||
    input.vestingEvents
  ) {
    sources.investor = {
      mints: items(input.investorEvents?.investorMints),
      dividendPaids: items(input.investorEvents?.investorDividendPaids),
      safeDepositRouterDeposits: items(input.safeDepositRouterEvents?.safeDeposits),
      cashRemunerationWithdrawTokens: items(
        input.cashRemunerationEvents?.cashRemunerationWithdrawTokens
      ),
      vestingReleases: items(input.vestingEvents?.vestingTokensReleaseds)
    }
  }

  if (input.safeAddress) {
    const incomingRows = toSafeTransferRows(
      input.safeTransfers,
      input.safeDepositRouterAddress,
      input.safeDepositRouterEvents?.safeDeposits?.items
    )
    const outgoingRows = toSafeOutgoingTransferRows(
      input.safeOutgoingTransactions,
      input.safeAddress
    )
    sources.safe = {
      safeAddress: input.safeAddress,
      transfers: [...incomingRows, ...outgoingRows]
    }
  }

  return sources
}

/**
 * The USD rate-of-record resolver for a team's feeds: the caller's price source
 * for native (POL/ETH), overlaid with the SHER price.
 *
 * SHER has no market price, so it is valued from the router's compensation
 * multiplier (1 SHER = 1/multiplier USD) — that is what makes a wage paid in SHER
 * increase Investor Equity. Here each SHER leg is stamped at the multiplier of its
 * **own date** (historised timeline), so a withdrawal / mint freezes at its
 * realization-date rate. {@link settleWithdrawnSher} then re-values the *pending*
 * (un-withdrawn) accruals to the current multiplier — see {@link buildRawCncEntries}.
 */
function buildRateOfRecord(input: CncAccountingInput): UsdRateOfRecord {
  const baseRate = input.rateOfRecord ?? phase1RateOfRecord
  const sherRate = makeSherUsdRate(
    buildSherMultiplierTimeline(
      input.safeDepositRouterEvents?.safeMultiplierUpdateds?.items,
      input.safeDepositRouterEvents?.safeDeposits?.items,
      input.currentSherMultiplier
    )
  )
  return sherRate
    ? (tokenId, at) => (tokenId === 'sher' ? sherRate(at) : baseRate(tokenId, at))
    : baseRate
}

/**
 * Run the source mappers and stamp each posting with its rate of record, yielding
 * the raw, pre-consolidation feed: Devise (`token`), Quantité (`rawAmount`), Taux
 * (`rate`) and the derived Montant USD (`amountUsd`), spec §2.
 */
export function buildRawCncEntries(input: CncAccountingInput): LedgerEntry[] {
  const internalAddresses = collectInternalAddresses(input.contracts)
  const rateOfRecord = buildRateOfRecord(input)

  const ctx = buildMapperContext({
    contracts: input.contracts,
    internalAddresses,
    feeCollectorAddress: input.feeCollectorAddress,
    sherTokenAddress: input.sherTokenAddress,
    rateOfRecord,
    classifications: toClassificationMap(input.classifications)
  })

  const rawEntries = buildCncLedgerEntries(toLedgerSources(input), ctx, {
    weeklyClaims: input.weeklyClaims,
    expenses: input.expenses
  })

  // The rate is a pure function of (token, timestamp), so it is resolved once here
  // rather than threaded through every mapper — with the same resolver the mappers
  // valued `amountUsd` with, so amountUsd = Quantité × rate. Each SHER leg lands at
  // its own-date rate, so a withdrawal / mint is frozen at its realization value.
  const stamped = rawEntries.map((entry) => ({
    ...entry,
    rate: tokenUsdRate(entry.token, atDate(entry.timestamp), rateOfRecord)
  }))

  // Freeze the withdrawn SHER at its realization rate and float the pending accruals
  // at the current multiplier: matched accrual quantity cancels its issuance in
  // `SHERS To Be Issued`, the rest floats until it is taken.
  const currentRate = currentSherUsdRate(
    input.safeDepositRouterEvents?.safeMultiplierUpdateds?.items,
    input.safeDepositRouterEvents?.safeDeposits?.items,
    input.currentSherMultiplier
  )
  // A Community Credit sweep has no Bank event that identifies its destination
  // generation. Keep that absence explicit; the canonical account registry turns
  // the Bank leg into an unresolved account instead of attributing it by timing.
  return settleWithdrawnSher(stamped, currentRate).sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Consolidate a raw feed into the ledger and the three statements. Split from
 * {@link assembleCncAccounting} so a caller that already holds the raw entries
 * (the composable, which derives the price-fetch days from them) doesn't run the
 * whole mapper pipeline a second time.
 */
export function assembleFromRawEntries(rawEntries: readonly LedgerEntry[]): CncAccounting {
  const reconciliation = reconcileJournalEntrySources(rawEntries)
  const { entries, summary } = buildLedger(reconciliation.entries)
  const accountRegistry = buildAccountRegistry(entries)
  const journal = buildJournal(entries, accountRegistry)

  return {
    entries,
    accountRegistry,
    journal,
    summary,
    generalLedger: buildGeneralLedger(journal),
    incomeStatement: buildIncomeStatement(entries),
    balanceSheet: buildBalanceSheet(entries),
    unmatchedFeeOperationIds: reconciliation.unmatchedFeeOperationIds
  }
}

/**
 * Assemble a team's consolidated ledger and the three statements from its raw
 * feeds. Pure: no I/O, no Vue — the composable supplies the fetched data.
 */
export function assembleCncAccounting(input: CncAccountingInput): CncAccounting {
  return assembleFromRawEntries(buildRawCncEntries(input))
}

/** An empty accounting result — used before any data has loaded. */
export function emptyCncAccounting(): CncAccounting {
  return assembleCncAccounting({})
}
