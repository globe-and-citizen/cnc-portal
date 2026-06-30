/**
 * `useCNCAccounting(teamId)` — the accounting data layer (issue #2118, step 4/5).
 *
 * Loads every feed a team's books need and exposes the consolidated ledger plus
 * the three financial statements to the UI from a single composable:
 *
 *   - **Ponder** — on-chain events for the team's Bank, CashRemuneration, Expense,
 *     InvestorV1 and SafeDepositRouter contracts (spec §3.1).
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
import { useQuery as useApolloQuery } from '@vue/apollo-composable'
import { useReadContract } from '@wagmi/vue'
import type { DocumentNode } from 'graphql'
import { type Address } from 'viem'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import { formatSafeDepositRouterMultiplier } from '@/utils/safeDepositRouterUtil'
import { FEE_COLLECTOR_ADDRESS, GRAPHQL_POLL_INTERVAL } from '@/constant'
import type { ContractType } from '@/types/teamContract'
import type { BankEventsQuery } from '@/types/ponder/bank'
import type { CashRemunerationEventsQuery } from '@/types/ponder/cash-remuneration'
import type { ExpenseEventsQuery } from '@/types/ponder/expense'
import type { InvestorEventsQuery, SafeDepositRouterEventsQuery } from '@/types/ponder/investor'
import { GET_BANK_EVENTS } from '@/queries/ponder/bank.queries'
import { GET_CASH_REMUNERATION_EVENTS } from '@/queries/ponder/cash-remuneration.queries'
import { GET_EXPENSE_EVENTS } from '@/queries/ponder/expense.queries'
import { GET_INVESTOR_EVENTS } from '@/queries/ponder/investor.queries'
import { GET_SAFE_DEPOSIT_ROUTER_EVENTS } from '@/queries/ponder/safe-deposit-router.queries'
import { useGetTeamQuery } from '@/queries/team.queries'
import { useGetTeamWeeklyClaimsQuery } from '@/queries/weeklyClaim.queries'
import { useGetExpensesQuery } from '@/queries/expense.queries'
import { useGetSafeIncomingTransfersQuery } from '@/queries/safe.queries'
import { useCurrencyStore } from '@/stores/currencyStore'
import {
  assembleCncAccounting,
  type CncAccounting,
  type CncAccountingInput
} from '@/utils/accounting/assemble'
import type { UsdRateOfRecord } from '@/utils/accounting/toUsd'
import type { AccountingSummary } from '@/utils/accounting/buildLedger'
import type { GeneralLedger } from '@/utils/accounting/generalLedger'
import type { IncomeStatement } from '@/utils/accounting/incomeStatement'
import type { BalanceSheet } from '@/utils/accounting/balanceSheet'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

/** How many of each event type to pull per contract (newest first). */
const EVENT_LIMIT = 500

export interface UseCNCAccountingOptions {
  /** Override the founder set (defaults to the team's `ownerAddress`). */
  founderAddresses?: MaybeRefOrGetter<Iterable<Address | string> | undefined>
  /** FX resolver for native / SHER (defaults to the Phase-1 zero-rate gap). */
  rateOfRecord?: UsdRateOfRecord
  /** On-chain SHER token address, so SHER amounts resolve to the `sher` token. */
  sherTokenAddress?: Address | string | null
}

export interface UseCNCAccountingReturn {
  /** Consolidated, deduped ledger postings. */
  entries: ComputedRef<LedgerEntry[]>
  /** Roll-up totals for the summary cards. */
  summary: ComputedRef<AccountingSummary>
  /** Double-entry journal + trial balance. */
  generalLedger: ComputedRef<GeneralLedger>
  incomeStatement: ComputedRef<IncomeStatement>
  balanceSheet: ComputedRef<BalanceSheet>
  /** True while any required feed is still loading. */
  isLoading: ComputedRef<boolean>
  /** The team query error (the only fatal one); optional feeds degrade silently. */
  error: ComputedRef<unknown>
  /** Re-run every underlying query. */
  refetch: () => Promise<unknown>
}

export function useCNCAccounting(
  teamId: MaybeRefOrGetter<string | null>,
  options: UseCNCAccountingOptions = {}
): UseCNCAccountingReturn {
  const team = useGetTeamQuery({ pathParams: { teamId } })
  const contracts = computed(() => team.data.value?.teamContracts ?? [])

  /** Resolve a contract's lower-cased address by type (Ponder stores lowercase). */
  const addressOf = (type: ContractType): ComputedRef<string> =>
    computed(() => contracts.value.find((c) => c.type === type)?.address?.toLowerCase() ?? '')

  const bankAddress = addressOf('Bank')
  const cashRemAddress = addressOf('CashRemunerationEIP712')
  const expenseAddress = addressOf('ExpenseAccountEIP712')
  const investorAddress = addressOf('InvestorV1')
  const routerAddress = addressOf('SafeDepositRouter')
  const safeAddress = computed(
    () => team.data.value?.safeAddress ?? contracts.value.find((c) => c.type === 'Safe')?.address
  )

  // ── Ponder: one event query per deployed contract, enabled only when present.
  // Variables/options follow the app's established Apollo pattern (reactive refs
  // inside the objects, as in BankTransactions.vue) so the query fires once the
  // contract address resolves from the team. ──
  const ponderQuery = <T>(document: DocumentNode, address: ComputedRef<string>) =>
    useApolloQuery<T>(
      document,
      { contractAddress: address, limit: EVENT_LIMIT },
      {
        enabled: computed(() => Boolean(address.value)),
        pollInterval: GRAPHQL_POLL_INTERVAL,
        fetchPolicy: 'cache-and-network'
      }
    )

  const bank = ponderQuery<BankEventsQuery>(GET_BANK_EVENTS, bankAddress)
  const cashRem = ponderQuery<CashRemunerationEventsQuery>(
    GET_CASH_REMUNERATION_EVENTS,
    cashRemAddress
  )
  const expense = ponderQuery<ExpenseEventsQuery>(GET_EXPENSE_EVENTS, expenseAddress)
  const investor = ponderQuery<InvestorEventsQuery>(GET_INVESTOR_EVENTS, investorAddress)
  const router = ponderQuery<SafeDepositRouterEventsQuery>(
    GET_SAFE_DEPOSIT_ROUTER_EVENTS,
    routerAddress
  )

  // ── Contract read: the router's live SHER multiplier. The `MultiplierUpdated`
  // events historise *changes*, but the initial multiplier is set in the
  // constructor and emits no event — so we read `multiplier` straight from the
  // contract to value SHER even before the first change (spec §1 "Currency").
  // Stored fixed-point at SHER's 6 decimals; format to whole units (1e6 → 1x). ──
  const routerMultiplier = useReadContract({
    address: computed(() => (routerAddress.value ? (routerAddress.value as Address) : undefined)),
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'multiplier',
    query: { enabled: computed(() => Boolean(routerAddress.value)) }
  })

  const currentSherMultiplier = computed<number | null>(() => {
    const raw = routerMultiplier.data.value
    if (typeof raw !== 'bigint') return null
    const whole = Number(formatSafeDepositRouterMultiplier(raw, 6))
    return Number.isFinite(whole) && whole > 0 ? whole : null
  })

  // ── Backend DB: weekly claims + approved expenses (off-chain enrichment) ──
  const weeklyClaims = useGetTeamWeeklyClaimsQuery({ queryParams: { teamId } })
  const expenses = useGetExpensesQuery({ queryParams: { teamId } })

  // ── Safe service: incoming transfers (optional / flaky — never blocks) ──
  const safeTransfers = useGetSafeIncomingTransfersQuery({
    pathParams: { safeAddress },
    queryParams: { limit: EVENT_LIMIT }
  })

  const founderAddresses = computed<Iterable<Address | string>>(() => {
    const override = toValue(options.founderAddresses)
    if (override) return override
    const owner = team.data.value?.ownerAddress
    return owner ? [owner] : []
  })

  // Team members — a member funding the Safe is investing in the company (invest
  // & get SHER → Investor Equity), not a client paying for services.
  const memberAddresses = computed<Iterable<Address | string>>(
    () => team.data.value?.members?.map((m) => m.address) ?? []
  )

  // USD price-of-record: the caller's resolver, else the app's live prices from
  // the currency store (CoinGecko). USDC is pegged $1 by `toUsd`, so this only
  // runs for the non-pegged tokens (native POL/ETH, SHER) — which otherwise show
  // as $0 under the Phase-1 default.
  const currencyStore = useCurrencyStore()
  const rateOfRecord: UsdRateOfRecord =
    options.rateOfRecord ?? ((tokenId) => currencyStore.getTokenPrice(tokenId, false, 'usd'))

  const accounting = computed<CncAccounting>(() => {
    const input: CncAccountingInput = {
      contracts: contracts.value,
      safeAddress: safeAddress.value,
      founderAddresses: founderAddresses.value,
      memberAddresses: memberAddresses.value,
      feeCollectorAddress: FEE_COLLECTOR_ADDRESS,
      sherTokenAddress: options.sherTokenAddress ?? null,
      safeDepositRouterAddress: routerAddress.value || null,
      currentSherMultiplier: currentSherMultiplier.value,
      rateOfRecord,
      bankEvents: bank.result.value,
      cashRemunerationEvents: cashRem.result.value,
      expenseEvents: expense.result.value,
      investorEvents: investor.result.value,
      safeDepositRouterEvents: router.result.value,
      safeTransfers: safeTransfers.data.value,
      weeklyClaims: weeklyClaims.data.value?.data,
      expenses: expenses.data.value
    }
    return assembleCncAccounting(input)
  })

  // The team query is the only fatal one — without contracts there are no books.
  // Loading reflects the team + on-chain + enrichment feeds; the Safe service is
  // optional, so it is excluded to keep a slow/flaky transfer feed from blocking.
  const isLoading = computed(
    () =>
      team.isLoading.value ||
      bank.loading.value ||
      cashRem.loading.value ||
      expense.loading.value ||
      investor.loading.value ||
      router.loading.value ||
      weeklyClaims.isLoading.value ||
      expenses.isLoading.value
  )

  const error = computed(() => team.error.value)

  const refetch = (): Promise<unknown> => {
    const run = (q: { refetch?: () => unknown }): unknown => q.refetch?.()
    return Promise.allSettled(
      [
        team,
        bank,
        cashRem,
        expense,
        investor,
        router,
        routerMultiplier,
        weeklyClaims,
        expenses,
        safeTransfers
      ].map(run)
    )
  }

  return {
    entries: computed(() => accounting.value.entries),
    summary: computed(() => accounting.value.summary),
    generalLedger: computed(() => accounting.value.generalLedger),
    incomeStatement: computed(() => accounting.value.incomeStatement),
    balanceSheet: computed(() => accounting.value.balanceSheet),
    isLoading,
    error,
    refetch
  }
}
