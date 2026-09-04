/**
 * `useCNCAccounting(teamId)` — the accounting data layer (issue #2118, step 4/5).
 *
 * Loads every feed a team's books need and exposes the consolidated ledger plus
 * the three financial statements to the UI from a single composable:
 *
 *   - **On-chain (getLogs)** — events for the team's Bank, CashRemuneration,
 *     Expense, FixedReturn (Community Credit), Investor and SafeDepositRouter
 *     contracts, reconstructed from the RPC via the shared `use*EventsViaLogs`
 *     composables (no indexer dependency).
 *   - **Safe** — the team Safe's incoming native / ERC-20 transfers (spec §3.1).
 *   - **Backend DB** — the team's contracts, signed weekly claims and approved
 *     expenses, the off-chain accrual + category context (spec §3.2).
 *
 * The raw feeds are handed to the pure {@link assembleCncAccounting}, which runs
 * the #2113 source mappers, the #2117 consolidation and the statement builders.
 * Optional / flaky sources (the external Safe service, a contract a team has not
 * deployed) degrade gracefully: a missing or failed feed is simply absent from
 * the ledger and never blocks the page or surfaces as a hard error.
 */
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { type Address } from 'viem'
import { safeDepositRouterAbi } from '@/artifacts/abi/generated'
import { formatSafeDepositRouterMultiplier } from '@/utils/safeDepositRouter/model'
import { FEE_COLLECTOR_ADDRESS } from '@/constant'
import type { ContractType, TeamContract } from '@/types/teamContract'
import type { ScanTarget } from '@/composables/eventsViaLogs'
import { useBankEventsViaLogs } from '@/composables/bank/useBankEventsViaLogs'
import { useCashRemunerationEventsViaLogs } from '@/composables/cashRemuneration/useCashRemunerationEventsViaLogs'
import { useExpenseEventsViaLogs } from '@/composables/expense/useExpenseEventsViaLogs'
import { useFixedReturnEventsViaLogs } from '@/composables/fixedReturn/useFixedReturnEventsViaLogs'
import { useFixedReturnAllOffers } from '@/composables/fixedReturn/reads'
import { useInvestorEventsViaLogs } from '@/composables/investor/useInvestorEventsViaLogs'
import { useVestingEventsViaLogs } from '@/composables/vesting/useVestingEventsViaLogs'
import { useSafeDepositRouterEventsViaLogs } from '@/composables/investor/useSafeDepositRouterEventsViaLogs'
import { useGetTeamQuery } from '@/queries/team.queries'
import { useGetTeamOfficersQuery } from '@/queries/contract.queries'
import {
  useGetSafeIncomingTransfersQuery,
  useGetSafeOutgoingTransactionsQuery
} from '@/queries/safe.queries'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useTransferInitiators } from './useTransferInitiators'
import { useAccountingBackendFeeds } from './useAccountingBackendFeeds'
import {
  assembleCncAccounting,
  type CncAccounting,
  type CncAccountingInput
} from '@/utils/accounting/assemble'
import type { CreditOfferTerms } from '@/utils/accounting/mappers/creditTimeline'
import type { UsdRateOfRecord } from '@/utils/accounting/toUsd'

/** How many of each event type to pull per contract (newest first). */
const EVENT_LIMIT = 500

export interface UseCNCAccountingOptions {
  /** FX resolver for native / SHER (defaults to the Phase-1 zero-rate gap). */
  rateOfRecord?: UsdRateOfRecord
  /** On-chain SHER token address, so SHER amounts resolve to the `sher` token. */
  sherTokenAddress?: Address | string | null
}

export interface UseCNCAccountingReturn {
  /** Consolidated, deduped legacy postings retained for projections not yet migrated. */
  entries: ComputedRef<CncAccounting['entries']>
  /** Canonical concrete-account source of truth for the assembled books. */
  accountRegistry: ComputedRef<CncAccounting['accountRegistry']>
  /** Validated journal assembled from the consolidated postings. */
  journal: ComputedRef<CncAccounting['journal']>
  /** The summary and financial reports computed from the assembled accounting books. */
  reports: ComputedRef<AccountingReports>
  /** True while any required feed is still loading. */
  isLoading: ComputedRef<boolean>
  /** The team query error (the only fatal one); optional feeds degrade silently. */
  error: ComputedRef<unknown>
  /** Contract generations whose on-chain scan failed — a partial-history warning. */
  reconciliationGaps: ComputedRef<ReconciliationGap[]>
  /** Re-run every underlying query. */
  refetch: () => Promise<unknown>
}

/** The report projections derived together from one consolidated accounting ledger. */
export type AccountingReports = Pick<
  CncAccounting,
  'summary' | 'generalLedger' | 'incomeStatement' | 'balanceSheet'
>

/** One contract generation that could not be loaded, for the UI gap warning. */
export interface ReconciliationGap {
  /** The money-pocket type whose generation failed (e.g. 'Bank'). */
  source: string
  /** The failed generation's contract address. */
  address: string
}

export function useCNCAccounting(
  teamId: MaybeRefOrGetter<string | null>,
  options: UseCNCAccountingOptions = {}
): UseCNCAccountingReturn {
  const team = useGetTeamQuery({ pathParams: { teamId } })
  const contracts = computed(() => team.data.value?.teamContracts ?? [])

  // Every Officer generation with its contracts and deploy block, from the shared
  // contract-history endpoint (`GET /contract/officers`) — reused rather than
  // duplicated so the books survive contract migrations (issue #2456).
  const officers = useGetTeamOfficersQuery({
    queryParams: { teamId: computed(() => toValue(teamId) ?? '') }
  })

  /** One deployment generation: its contracts and the deploy block to scan from. */
  interface Generation {
    deployBlockNumber: string | null
    contracts: { address: string; type: string; deployer?: string }[]
  }

  const generations = computed<Generation[]>(() => {
    const officerList = officers.data.value ?? []
    // No Officer history (older data): treat the current contracts as a single
    // boundary-less generation so the books still load.
    if (!officerList.length) {
      return [{ deployBlockNumber: null, contracts: contracts.value }]
    }
    const gens: Generation[] = officerList.map((officer) => ({
      deployBlockNumber: officer.deployBlockNumber,
      contracts: officer.contracts
    }))
    // Officer-less pockets (Safe / SafeDepositRouter) survive redeploys and are
    // governed by no Officer; add them once as a boundary-less generation.
    const governed = new Set(
      officerList.flatMap((officer) =>
        officer.contracts.map((contract) => contract.address.toLowerCase())
      )
    )
    const officerless = contracts.value.filter(
      (contract) => !governed.has(contract.address.toLowerCase())
    )
    if (officerless.length) gens.push({ deployBlockNumber: null, contracts: officerless })
    return gens
  })

  const allContracts = computed<TeamContract[]>(() =>
    generations.value.flatMap((generation) =>
      generation.contracts.map((contract) => ({
        address: contract.address as Address,
        type: contract.type as ContractType,
        deployer: (contract.deployer ?? contract.address) as Address,
        admins: []
      }))
    )
  )

  /** Scan targets for a contract type across every generation, each with its deploy block. */
  const targetsOf = (...types: ContractType[]): ComputedRef<ScanTarget[]> =>
    computed(() => {
      const wanted = new Set<string>(types)
      const targets: ScanTarget[] = []
      for (const generation of generations.value) {
        const fromBlock = generation.deployBlockNumber
          ? BigInt(generation.deployBlockNumber)
          : undefined
        for (const contract of generation.contracts) {
          if (wanted.has(contract.type)) {
            targets.push({ address: contract.address.toLowerCase(), fromBlock })
          }
        }
      }
      return targets
    })

  /** Current-generation address for reads that reflect live contract state. */
  const addressOf = (type: ContractType): ComputedRef<string> =>
    computed(
      () => contracts.value.find((contract) => contract.type === type)?.address?.toLowerCase() ?? ''
    )

  // Auto-detect Investor: V2 ('Investor') preferred, V1 ('InvestorV1') fallback
  const addressOfInvestor = (): ComputedRef<string> =>
    computed(
      () =>
        contracts.value
          .find((contract) => contract.type === 'Investor' || contract.type === 'InvestorV1')
          ?.address?.toLowerCase() ?? ''
    )

  const fixedReturnAddress = addressOf('FixedReturn')
  const investorAddress = addressOfInvestor()
  const routerAddress = addressOf('SafeDepositRouter')
  const safeAddress = computed(
    () =>
      team.data.value?.safeAddress ??
      contracts.value.find((contract) => contract.type === 'Safe')?.address
  )

  const bankTargets = targetsOf('Bank')
  const cashRemTargets = targetsOf('CashRemunerationEIP712')
  const expenseTargets = targetsOf('ExpenseAccountEIP712')
  const fixedReturnTargets = targetsOf('FixedReturn')
  const investorTargets = targetsOf('Investor', 'InvestorV1')
  const vestingTargets = targetsOf('Vesting')
  const routerTargets = targetsOf('SafeDepositRouter')

  const bank = useBankEventsViaLogs(bankTargets)
  const cashRem = useCashRemunerationEventsViaLogs(cashRemTargets)
  const expense = useExpenseEventsViaLogs(expenseTargets)
  const fixedReturn = useFixedReturnEventsViaLogs(fixedReturnTargets)
  const investor = useInvestorEventsViaLogs(investorTargets)
  const vesting = useVestingEventsViaLogs(vestingTargets)
  const router = useSafeDepositRouterEventsViaLogs(routerTargets)

  // ── Contract read: the router's live SHER multiplier. The `MultiplierUpdated`
  // events historise *changes*, but the initial multiplier is set in the
  // constructor and emits no event — so we read `multiplier` straight from the
  // contract to value SHER even before the first change (spec §1 "Currency").
  // Stored fixed-point at SHER's 6 decimals; format to whole units (1e6 → 1x). ──
  const routerMultiplier = useReadContract({
    address: computed(() => (routerAddress.value ? (routerAddress.value as Address) : undefined)),
    abi: safeDepositRouterAbi,
    functionName: 'getMultiplier',
    query: { enabled: computed(() => Boolean(routerAddress.value)) }
  })

  const currentSherMultiplier = computed<number | null>(() => {
    const raw = routerMultiplier.data.value
    if (typeof raw !== 'bigint') return null
    const whole = Number(formatSafeDepositRouterMultiplier(raw, 6))
    return Number.isFinite(whole) && whole > 0 ? whole : null
  })

  // ── Contract read: each Community Credit round's rate. It does not reach the
  // mapper through the event feed, and without it the fixed return can only be
  // expensed on the day it is paid — so the offer structs are read straight from
  // FixedReturn and handed to the mapper, which recognises the whole fee when the
  // round funds (see mappers/creditTimeline). A failed read simply leaves the list
  // empty and the books fall back to the cash-basis treatment. ──
  const fixedReturnOffers = useFixedReturnAllOffers(fixedReturnAddress)

  const fixedReturnOfferTerms = computed<CreditOfferTerms[]>(() =>
    (fixedReturnOffers.data.value ?? []).map(({ offerId, offer }) => ({
      offerId: String(offerId),
      interestRateBps: Number(offer.interestRateBps)
    }))
  )

  // ── Backend DB: the off-chain enrichment feeds (claims, expenses, classifications) ──
  const { weeklyClaims, expenses, classifications } = useAccountingBackendFeeds(teamId)

  // ── Safe service: incoming + outgoing transfers (optional / flaky — never blocks) ──
  const safeTransfers = useGetSafeIncomingTransfersQuery({
    pathParams: { safeAddress },
    queryParams: { limit: EVENT_LIMIT }
  })
  const safeOutgoing = useGetSafeOutgoingTransactionsQuery({
    pathParams: { safeAddress },
    queryParams: { limit: EVENT_LIMIT }
  })

  // Live-price fallback: the caller's resolver, else the app's live prices from
  // the currency store (CoinGecko). Used only while a day's historical price is
  // in flight — the timestamped rate below is the actual rate of record.
  const currencyStore = useCurrencyStore()
  const liveRate: UsdRateOfRecord =
    options.rateOfRecord ?? ((tokenId) => currencyStore.getTokenPrice(tokenId, false, 'usd'))

  // The raw feeds + the live-price fallback — everything the ledger needs except
  // the resolved historical rate.
  const baseInput = computed<CncAccountingInput>(() => ({
    contracts: allContracts.value,
    safeAddress: safeAddress.value,
    feeCollectorAddress: FEE_COLLECTOR_ADDRESS,
    sherTokenAddress: options.sherTokenAddress ?? (investorAddress.value || null),
    safeDepositRouterAddress: routerAddress.value || null,
    currentSherMultiplier: currentSherMultiplier.value,
    rateOfRecord: liveRate,
    bankEvents: bank.result.value,
    cashRemunerationEvents: cashRem.result.value,
    expenseEvents: expense.result.value,
    fixedReturnEvents: fixedReturn.result.value,
    fixedReturnOfferTerms: fixedReturnOfferTerms.value,
    investorEvents: investor.result.value,
    vestingEvents: vesting.result.value,
    safeDepositRouterEvents: router.result.value,
    safeTransfers: safeTransfers.data.value,
    safeOutgoingTransactions: safeOutgoing.data.value,
    weeklyClaims: weeklyClaims.data.value?.data,
    expenses: expenses.data.value,
    classifications: classifications.data.value
  }))

  // Native (POL/ETH) is valued at the **current** live price (currency store /
  // CoinGecko) — the same "current rate everywhere" rule SHER follows. A fixed POL
  // quantity is worth today's price wherever it appears, so the treasury asset
  // reflects real current value and the whole POL book re-values together when the
  // price moves (no per-date historical fetch). USDC is pegged $1 by `toUsd`; SHER
  // is valued from the router multiplier (see buildRateOfRecord). The live price is
  // already wired into `baseInput.rateOfRecord` (`liveRate`).
  const accounting = computed<CncAccounting>(() => assembleCncAccounting(baseInput.value))

  // Resolve the human who signed each internal transfer (the tx feed carries only
  // a hash), then attach it so the ledger reads "Stravid87 transferred money from
  // Bank to Safe". Optional: an unresolved hash keeps the source-pocket fallback.
  const transferHashes = computed<string[]>(() => {
    const hashes = new Set<string>()
    for (const entry of accounting.value.entries) {
      if (entry.internal && entry.txHash) hashes.add(entry.txHash)
    }
    return [...hashes]
  })
  const transferInitiators = useTransferInitiators(transferHashes)

  const entries = computed<CncAccounting['entries']>(() => {
    const initiators = transferInitiators.value
    if (!initiators.size) return accounting.value.entries
    return accounting.value.entries.map((entry) =>
      entry.internal && entry.txHash && initiators.has(entry.txHash)
        ? { ...entry, initiator: initiators.get(entry.txHash) }
        : entry
    )
  })

  // A generation whose on-chain scan failed is surfaced as a reconciliation gap
  // (rather than silently dropping the whole contract type), so the view can warn
  // that history may be partial (issue #2456).
  const reconciliationGaps = computed<ReconciliationGap[]>(() =>
    (
      [
        ['Bank', bank],
        ['CashRemuneration', cashRem],
        ['Expense', expense],
        ['FixedReturn', fixedReturn],
        ['Investor', investor],
        ['Vesting', vesting],
        ['SafeDepositRouter', router]
      ] as const
    ).flatMap(([source, feed]) => feed.gaps.value.map((gap) => ({ source, address: gap.address })))
  )

  // The team query is the only fatal one — without contracts there are no books.
  // Loading reflects the team + on-chain + enrichment feeds; the Safe service is
  // optional, so it is excluded to keep a slow/flaky transfer feed from blocking.
  const isLoading = computed(
    () =>
      team.isLoading.value ||
      officers.isPending.value ||
      bank.loading.value ||
      cashRem.loading.value ||
      expense.loading.value ||
      fixedReturn.loading.value ||
      investor.loading.value ||
      vesting.loading.value ||
      router.loading.value ||
      weeklyClaims.isLoading.value ||
      expenses.isLoading.value
  )

  const error = computed(() => team.error.value)

  const refetch = (): Promise<unknown> =>
    Promise.allSettled(
      [
        team,
        officers,
        bank,
        cashRem,
        expense,
        fixedReturn,
        fixedReturnOffers,
        investor,
        vesting,
        router,
        routerMultiplier,
        weeklyClaims,
        expenses,
        classifications,
        safeTransfers,
        safeOutgoing
      ].map((query) => query.refetch?.())
    )

  return {
    entries,
    accountRegistry: computed(() => accounting.value.accountRegistry),
    journal: computed(() => accounting.value.journal),
    reports: computed<AccountingReports>(() => ({
      summary: accounting.value.summary,
      generalLedger: accounting.value.generalLedger,
      incomeStatement: accounting.value.incomeStatement,
      balanceSheet: accounting.value.balanceSheet
    })),
    isLoading,
    error,
    reconciliationGaps,
    refetch
  }
}
