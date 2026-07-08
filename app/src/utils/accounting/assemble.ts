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
 *             → general ledger / income statement / balance sheet (#2117)
 */
import { getAddress, isAddress, type Address } from 'viem'
import type { TeamContract } from '@/types/teamContract'
import type { WeeklyClaim } from '@/types/cash-remuneration'
import type { ExpenseResponse } from '@/types/expense-account'
import type { SafeIncomingTransfer } from '@/types/safe'
import type { BankEventsQuery } from '@/types/ponder/bank'
import type { CashRemunerationEventsQuery } from '@/types/ponder/cash-remuneration'
import type { ExpenseEventsQuery } from '@/types/ponder/expense'
import type {
  InvestorEventsQuery,
  SafeDepositRouterEventsQuery,
  SafeDepositRow
} from '@/types/ponder/investor'
import { collectInternalAddresses } from '@/utils/accounting/internalAddresses'
import { buildMapperContext } from '@/utils/accounting/mappers/context'
import { buildCncLedgerEntries, type LedgerSources } from '@/utils/accounting/mappers'
import { buildLedger, type AccountingSummary } from '@/utils/accounting/buildLedger'
import { buildGeneralLedger, type GeneralLedger } from '@/utils/accounting/generalLedger'
import { buildIncomeStatement, type IncomeStatement } from '@/utils/accounting/incomeStatement'
import { buildBalanceSheet, type BalanceSheet } from '@/utils/accounting/balanceSheet'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { UsdRateOfRecord } from '@/utils/accounting/toUsd'
import { buildSherMultiplierTimeline, makeSherUsdRate } from '@/utils/accounting/sherRate'
import type { SafeTransferRow } from '@/utils/accounting/mappers/safe'

/** The raw feeds for one team, as fetched by {@link useCNCAccounting}. */
export interface CncAccountingInput {
  /** The team's `TeamContract` rows — resolve the internal pockets. */
  contracts?: readonly TeamContract[]
  /** The team's Gnosis Safe address — classifies each Safe transfer. */
  safeAddress?: Address | string | null
  /** Founder / owner addresses whose treasury inflows are Owner Capital. */
  founderAddresses?: Iterable<Address | string>
  /** Team member addresses — a member's Safe inflow is a capital contribution
   *  (invest & get SHER → Investor Equity), not client revenue. */
  memberAddresses?: Iterable<Address | string>
  /** Protocol-wide FeeCollector address (its pocket is `Cash — FeeCollector`). */
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
  investorEvents?: InvestorEventsQuery | null
  safeDepositRouterEvents?: SafeDepositRouterEventsQuery | null
  safeTransfers?: readonly SafeIncomingTransfer[] | null
  // ── portal DB rows (off-chain enrichment context, spec §3.2) ──
  weeklyClaims?: readonly WeeklyClaim[]
  expenses?: readonly ExpenseResponse[]
}

/** The consolidated ledger + the three statements a team's books resolve to. */
export interface CncAccounting {
  /** Deduped, chronologically sorted postings — the canonical feed. */
  entries: LedgerEntry[]
  /** Roll-up totals for the summary cards. */
  summary: AccountingSummary
  /** Double-entry journal + trial balance. */
  generalLedger: GeneralLedger
  incomeStatement: IncomeStatement
  balanceSheet: BalanceSheet
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

/** A SHER value transfer carries no cash; skip NFT moves entirely. */
function isMonetaryTransfer(t: SafeIncomingTransfer): boolean {
  return t.type === 'ETHER_TRANSFER' || t.type === 'ERC20_TRANSFER'
}

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && isAddress(a) && isAddress(b) && getAddress(a) === getAddress(b)
}

/** `${depositor}|${amount}` — keys a Safe inflow to the router deposit that backs it. */
function routedKey(depositor: string, amount: string): string {
  return `${depositor.toLowerCase()}|${amount}`
}

/**
 * A consumable multiset of the (depositor, deposited-amount) pairs that arrived
 * through the SafeDepositRouter, so the matching Safe inflows can be excluded.
 */
function buildRoutedDeposits(
  deposits: readonly SafeDepositRow[] | null | undefined
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const d of deposits ?? []) {
    const key = routedKey(d.depositor, d.tokenAmount)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Adapt the Safe Transaction Service incoming transfers into the mapper's
 * {@link SafeTransferRow} shape. ERC-721 moves are dropped (no cash); the ISO
 * `executionDate` becomes Unix seconds.
 *
 * Investments routed through the SafeDepositRouter also land in the Safe and are
 * booked from the router event (UC-SDR-01 → Investor Equity), so the matching
 * Safe inflow is excluded to avoid double-counting it **and** misreading it as a
 * client payment (Service Revenue). The router forwards funds with `from = the
 * depositor` (not the router address), so excluding only `from === router` is not
 * enough: we also drop inflows that match a router deposit by (depositor, amount).
 */
export function toSafeTransferRows(
  transfers: readonly SafeIncomingTransfer[] | null | undefined,
  routerAddress?: Address | string | null,
  routerDeposits?: readonly SafeDepositRow[] | null
): SafeTransferRow[] {
  const routed = buildRoutedDeposits(routerDeposits)
  const rows: SafeTransferRow[] = []
  transfers?.forEach((t, index) => {
    if (!isMonetaryTransfer(t)) return
    if (routerAddress && sameAddress(t.from, routerAddress)) return
    const remaining = routed.get(routedKey(t.from, t.value)) ?? 0
    if (remaining > 0) {
      routed.set(routedKey(t.from, t.value), remaining - 1) // routed investment — booked by UC-SDR-01
      return
    }
    rows.push({
      id: `${t.transactionHash}-${index}`,
      from: t.from,
      to: t.to,
      token: t.type === 'ERC20_TRANSFER' ? (t.tokenAddress ?? null) : null,
      amount: t.value,
      timestamp: Math.floor(new Date(t.executionDate).getTime() / 1000),
      txHash: t.transactionHash
    })
  })
  return rows
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
    sources.fees = { bankFeePaids: items(input.bankEvents.bankFeePaids) }
  }

  if (input.cashRemunerationEvents) {
    const c = input.cashRemunerationEvents
    sources.cashRemuneration = {
      deposits: items(c.cashRemunerationDeposits),
      withdraws: items(c.cashRemunerationWithdraws),
      withdrawTokens: items(c.cashRemunerationWithdrawTokens),
      ownerTreasuryWithdrawNatives: items(c.cashRemunerationOwnerTreasuryWithdrawNatives),
      ownerTreasuryWithdrawTokens: items(c.cashRemunerationOwnerTreasuryWithdrawTokens)
    }
  }

  if (input.expenseEvents) {
    const e = input.expenseEvents
    sources.expenseAccount = {
      deposits: items(e.expenseDeposits),
      tokenDeposits: items(e.expenseTokenDeposits),
      transfers: items(e.expenseTransfers),
      tokenTransfers: items(e.expenseTokenTransfers),
      ownerTreasuryWithdrawNatives: items(e.expenseOwnerTreasuryWithdrawNatives),
      ownerTreasuryWithdrawTokens: items(e.expenseOwnerTreasuryWithdrawTokens)
    }
  }

  if (input.safeDepositRouterEvents) {
    sources.safeDepositRouter = { deposits: items(input.safeDepositRouterEvents.safeDeposits) }
  }

  // The investor mapper correlates each mint with the deposits/withdraws that
  // already booked the equity (catalogue §5.4), so it needs those cross-source
  // rows even when there are no Investor events of its own to map.
  if (input.investorEvents || input.safeDepositRouterEvents || input.cashRemunerationEvents) {
    sources.investor = {
      mints: items(input.investorEvents?.investorMints),
      dividendPaids: items(input.investorEvents?.investorDividendPaids),
      safeDepositRouterDeposits: items(input.safeDepositRouterEvents?.safeDeposits),
      cashRemunerationWithdrawTokens: items(
        input.cashRemunerationEvents?.cashRemunerationWithdrawTokens
      )
    }
  }

  if (input.safeAddress) {
    sources.safe = {
      safeAddress: input.safeAddress,
      transfers: toSafeTransferRows(
        input.safeTransfers,
        input.safeDepositRouterAddress,
        input.safeDepositRouterEvents?.safeDeposits?.items
      )
    }
  }

  return sources
}

/**
 * Assemble a team's consolidated ledger and the three statements from its raw
 * feeds. Pure: no I/O, no Vue — the composable supplies the fetched data.
 */
export function assembleCncAccounting(input: CncAccountingInput): CncAccounting {
  const internalAddresses = collectInternalAddresses(
    input.contracts,
    input.feeCollectorAddress ? [input.feeCollectorAddress] : []
  )

  // SHER has no market price; value it from the router's compensation multiplier
  // (1 SHER = 1/multiplier USD, historised over the multiplier changes) so
  // wage-in-SHER increases Investor Equity. With no change events we use the
  // router's live multiplier (read from the contract) or, failing that, the
  // contract's 1x default (1 SHER = $1) — no longer the Phase-1 $0.
  const baseRate = input.rateOfRecord ?? phase1RateOfRecord
  const sherRate = makeSherUsdRate(
    buildSherMultiplierTimeline(
      input.safeDepositRouterEvents?.safeMultiplierUpdateds?.items,
      input.safeDepositRouterEvents?.safeDeposits?.items,
      input.currentSherMultiplier
    )
  )
  const rateOfRecord: UsdRateOfRecord = sherRate
    ? (tokenId, at) => (tokenId === 'sher' ? sherRate(at) : baseRate(tokenId, at))
    : baseRate

  const ctx = buildMapperContext({
    contracts: input.contracts,
    internalAddresses,
    founderAddresses: input.founderAddresses,
    memberAddresses: input.memberAddresses,
    feeCollectorAddress: input.feeCollectorAddress,
    sherTokenAddress: input.sherTokenAddress,
    rateOfRecord
  })

  const rawEntries = buildCncLedgerEntries(toLedgerSources(input), ctx, {
    weeklyClaims: input.weeklyClaims,
    expenses: input.expenses
  })

  const { entries, summary } = buildLedger(rawEntries)

  return {
    entries,
    summary,
    generalLedger: buildGeneralLedger(entries),
    incomeStatement: buildIncomeStatement(entries),
    balanceSheet: buildBalanceSheet(entries)
  }
}

/** An empty accounting result — used before any data has loaded. */
export function emptyCncAccounting(): CncAccounting {
  return assembleCncAccounting({})
}
