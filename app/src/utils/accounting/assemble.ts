/**
 * Pure assembly of a team's CNC accounting (issue #2118, the data layer's core).
 *
 * The composable {@link useCNCAccounting} fetches the raw feeds — RPC contract
 * events, the team's Safe incoming transfers and the portal DB rows — and hands
 * them to this **pure** function. Keeping the adaptation + statement build here
 * (rather than inside the composable) means the whole pipeline is unit-testable
 * with hand-built sample data, no Vue or network mocks required (same philosophy
 * as the source mappers, spec §2).
 *
 * Pipeline (spec §2):
 *   raw feeds → source adapters → JournalEntryDraft[]
 *             → account evidence → reconcile and finalize once
 *             → JournalEntry[]
 */
import { type Address } from 'viem'
import type { TeamContract } from '@/types/teamContract'
import type { WeeklyClaim } from '@/types/cash-remuneration'
import type { ExpenseResponse } from '@/types/expense-account'
import type { SafeIncomingTransfer, SafeTransaction } from '@/types/safe'
import type { JournalAccountAssignmentRecord } from '@/types/journal-account-assignment'
import type { BankEventFeed } from '@/types/contract-events/bank'
import type { CashRemunerationEventFeed } from '@/types/contract-events/cash-remuneration'
import type { ExpenseEventFeed } from '@/types/contract-events/expense'
import type { FixedReturnEventFeed } from '@/types/contract-events/fixedReturn'
import type {
  InvestorEventFeed,
  SafeDepositRouterEventFeed
} from '@/types/contract-events/investor'
import type { VestingEventFeed } from '@/types/contract-events/vesting'
import { collectInternalAddresses } from '@/utils/accounting/internalAddresses'
import { buildMapperContext } from '@/utils/accounting/mappers/context'
import type { CreditOfferTerms } from '@/utils/accounting/mappers/creditTimeline'
import { mapCncJournalEntryDrafts, type JournalEntrySources } from '@/utils/accounting/mappers'
import {
  resolveAccountInstances,
  type TransactionAccountEvidence
} from '@/utils/accounting/accountInstances'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { applyJournalAccountAssignments } from '@/utils/accounting/journalAccountAssignment'
import { finalizeJournalEntryDrafts } from '@/utils/accounting/journalEntry'
import type { JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import type { JournalEntry } from '@/utils/accounting/types'
import { tokenUsdRate, type UsdRateOfRecord } from '@/utils/accounting/toUsd'
import {
  buildSherMultiplierTimeline,
  makeSherUsdRate,
  currentSherUsdRate
} from '@/utils/accounting/sherRate'
import { settleWithdrawnSher } from '@/utils/accounting/sherIssuance'
import { atDate } from '@/utils/accounting/mappers/context'
import { toSafeTransferRows, toSafeOutgoingTransferRows } from '@/utils/accounting/safeTransfers'

/** The raw feeds for one team, as fetched by {@link useCNCAccounting}. */
export interface CncAccountingInput {
  /** The team's `TeamContract` rows — resolve the internal pockets. */
  contracts?: readonly TeamContract[]
  /** The team's Gnosis Safe address — classifies each Safe transfer. */
  safeAddress?: Address | string | null
  /** On-chain SHER token address, so it resolves to the `sher` token id. */
  sherTokenAddress?: Address | string | null
  /** Live SHER-per-token multiplier (whole units) read straight from the router,
   *  used to value SHER when there are no `MultiplierUpdated` events (the
   *  constructor's initial multiplier emits none). Defaults to 1x (1 SHER = $1). */
  currentSherMultiplier?: number | null
  /** FX resolver for non-pegged tokens (native, SHER) — see toUsd. */
  rateOfRecord?: UsdRateOfRecord
  // ── raw query results (any may be null: source absent, disabled or failed) ──
  bankEvents?: BankEventFeed | null
  cashRemunerationEvents?: CashRemunerationEventFeed | null
  expenseEvents?: ExpenseEventFeed | null
  fixedReturnEvents?: FixedReturnEventFeed | null
  /** Rate + maturity per Community Credit offer, read from the contract — what
   *  lets the interest be accrued over the term instead of expensed at payment. */
  fixedReturnOfferTerms?: readonly CreditOfferTerms[] | null
  investorEvents?: InvestorEventFeed | null
  vestingEvents?: VestingEventFeed | null
  safeDepositRouterEvents?: SafeDepositRouterEventFeed | null
  safeTransfers?: readonly SafeIncomingTransfer[] | null
  /** Executed multisig transactions — outflows from the Safe. */
  safeOutgoingTransactions?: readonly SafeTransaction[] | null
  // ── portal DB rows (off-chain enrichment context, spec §3.2) ──
  weeklyClaims?: readonly WeeklyClaim[]
  expenses?: readonly ExpenseResponse[]
  /** Owner-selected counter-accounts, keyed by transaction-backed JournalEntry. */
  accountAssignments?: readonly JournalAccountAssignmentRecord[] | null
}

/** The canonical journal and reconciliation diagnostics resolved for a team's books. */
export interface CncAccounting {
  /** The validated, ordered double-entry journal built once after consolidation. */
  journal: JournalEntry[]
  /** Fee logs withheld because their Bank outflow counterpart is missing. */
  unmatchedFeeOperationIds: string[]
}

/** Preserve non-pegged source movements until their rate-of-record source resolves. */
const unavailableRateOfRecord: UsdRateOfRecord = () => 0

/** Pull an event-feed field's `.items`, tolerating a missing/null result. */
function items<T>(field: { items: T[] } | null | undefined): T[] {
  return field?.items ?? []
}

/** Build the {@link JournalEntrySources} the mappers consume from the raw query results. */
function toJournalEntrySources(input: CncAccountingInput): JournalEntrySources {
  const sources: JournalEntrySources = {}

  if (input.bankEvents) {
    sources.bank = {
      deposits: items(input.bankEvents.bankDeposits),
      tokenDeposits: items(input.bankEvents.bankTokenDeposits),
      transfers: items(input.bankEvents.bankTransfers),
      tokenTransfers: items(input.bankEvents.bankTokenTransfers),
      fees: items(input.bankEvents.bankFeePaids)
    }
  }

  if (input.cashRemunerationEvents || input.weeklyClaims) {
    const events = input.cashRemunerationEvents
    sources.payroll = {
      deposits: items(events?.cashRemunerationDeposits),
      withdraws: items(events?.cashRemunerationWithdraws),
      withdrawTokens: items(events?.cashRemunerationWithdrawTokens),
      ownerTreasuryWithdrawNatives: items(events?.cashRemunerationOwnerTreasuryWithdrawNatives),
      ownerTreasuryWithdrawTokens: items(events?.cashRemunerationOwnerTreasuryWithdrawTokens),
      weeklyClaims: input.weeklyClaims
    }
  }

  if (input.expenseEvents) {
    const events = input.expenseEvents
    sources.expense = {
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
 * (un-withdrawn) accruals to the current multiplier — see {@link buildCncJournalEntryDrafts}.
 */
function buildRateOfRecord(input: CncAccountingInput): UsdRateOfRecord {
  const baseRate = input.rateOfRecord ?? unavailableRateOfRecord
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
 * the drafts' Devise (`token`), Quantité (`rawAmount`) and Taux (`rate`), spec §2.
 * The exact USD amount does not exist until final JournalEntry lines are built.
 */
export function buildCncJournalEntryDrafts(input: CncAccountingInput): JournalEntryDraft[] {
  const internalAddresses = collectInternalAddresses(input.contracts)
  const rateOfRecord = buildRateOfRecord(input)

  const ctx = buildMapperContext({
    contracts: input.contracts,
    internalAddresses,
    sherTokenAddress: input.sherTokenAddress,
    rateOfRecord
  })

  const drafts = mapCncJournalEntryDrafts(toJournalEntrySources(input), ctx, {
    weeklyClaims: input.weeklyClaims,
    expenses: input.expenses
  })

  // The rate is a pure function of (token, timestamp), so it is resolved once here
  // rather than threaded through every mapper. Each SHER leg lands at its own-date
  // rate, so a withdrawal / mint is frozen at its realization value.
  const stamped = drafts.map((entry) => ({
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
 * Consolidate source drafts into the canonical journal. Split from
 * {@link assembleWithAccountEvidence} so the accounting composable can derive
 * price-fetch days from the drafts without running the mapper pipeline twice.
 */
function assembleFromDrafts(
  drafts: readonly JournalEntryDraft[],
  accountAssignments?: readonly JournalAccountAssignmentRecord[] | null
): CncAccounting {
  const finalized = finalizeJournalEntryDrafts(drafts)
  const journal = applyJournalAccountAssignments(finalized.journal, accountAssignments)

  return {
    journal,
    unmatchedFeeOperationIds: finalized.unmatchedFeeOperationIds
  }
}

/**
 * Complete deployment-specific cash legs from verified transaction evidence
 * before building the canonical journal.
 */
export function assembleWithAccountEvidence(
  drafts: readonly JournalEntryDraft[],
  deploymentAccounts: ReadonlyMap<string, AccountName>,
  evidence: TransactionAccountEvidence,
  accountAssignments?: readonly JournalAccountAssignmentRecord[] | null
): CncAccounting {
  return assembleFromDrafts(
    resolveAccountInstances(drafts, deploymentAccounts, evidence),
    accountAssignments
  )
}
