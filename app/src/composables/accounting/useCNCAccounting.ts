/**
 * `useCNCAccounting(teamId)` — the accounting data layer (issue #2118, step 4/5).
 *
 * Loads every feed a team's books need and exposes the canonical journal to the
 * UI from a single composable:
 *
 *   - **On-chain (getLogs)** — events for the team's Bank, CashRemuneration,
 *     Expense, FixedReturn (Community Credit), Investor and SafeDepositRouter
 *     contracts, reconstructed from the RPC via the shared `use*EventsViaLogs`
 *     composables (no indexer dependency).
 *   - **Safe** — the team Safe's incoming native / ERC-20 transfers (spec §3.1).
 *   - **Backend DB** — the team's contracts, signed weekly claims and approved
 *     expenses, the off-chain accrual and journal account-assignment context
 *     (spec §3.2).
 *
 * The raw feeds are mapped into a pure posting feed, completed with transaction
 * receipt account evidence, then consolidated into the canonical journal.
 * Every material source exposes an explicit availability state. A partial feed
 * may preserve usable journal entries, but it is never presented as complete.
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { type Address } from 'viem'
import { safeDepositRouterAbi } from '@/artifacts/abi/generated'
import { formatSafeDepositRouterMultiplier } from '@/utils/safeDepositRouter/model'
import { normalizeSafeAddress } from '@/utils/safe/address'
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
import { useGetExpensesQuery } from '@/queries/expense.queries'
import { useGetJournalAccountAssignmentsQuery } from '@/queries/journalAccountAssignment.queries'
import {
  useGetSafeIncomingTransfersQuery,
  useGetSafeOutgoingTransactionsQuery
} from '@/queries/safe.queries'
import { useGetTeamWeeklyClaimsQuery } from '@/queries/weeklyClaim.queries'
import { useHistoricalTokenRatesQuery } from '@/queries/historicalTokenRate.queries'
import { useTransactionEvidence } from './useTransactionEvidence'
import {
  accountingEventSource,
  accountingQuerySource,
  useAccountingStatus
} from './useAccountingStatus'
import {
  assembleWithAccountEvidence,
  buildCncJournalEntryDrafts,
  type CncAccounting,
  type CncAccountingInput
} from '@/utils/accounting/assemble'
import { knownDeploymentAccounts } from '@/utils/accounting/accountInstances'
import type { CreditOfferTerms } from '@/utils/accounting/mappers/creditTimeline'
import * as accountingValuation from '@/utils/accounting/toUsd'

/** Safe Transaction Service page size; every page is loaded before assembly. */
const SAFE_PAGE_SIZE = 500

interface UseCNCAccountingOptions {
  /** Deterministic non-pegged rate resolver override, primarily for isolated consumers/tests. */
  rateOfRecord?: accountingValuation.UsdRateOfRecord
  /** On-chain SHER token address, so SHER amounts resolve to the `sher` token. */
  sherTokenAddress?: Address | string | null
}

export function useCNCAccounting(
  teamId: MaybeRefOrGetter<string | null>,
  options: UseCNCAccountingOptions = {}
) {
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
  const targetsOf = (...types: ContractType[]) =>
    computed<ScanTarget[]>(() => {
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

  /**
   * Current-generation address for reads that reflect live contract state.
   * Types are checked in preference order so API result ordering cannot select
   * a legacy deployment over its current replacement.
   */
  const addressOf = (...types: ContractType[]) =>
    computed<string>(() => {
      for (const type of types) {
        const address = contracts.value.find((contract) => contract.type === type)?.address
        if (address) return address.toLowerCase()
      }
      return ''
    })

  const fixedReturnAddress = addressOf('FixedReturn')
  const investorAddress = addressOf('Investor', 'InvestorV1')
  const routerAddress = addressOf('SafeDepositRouter')
  const safeAddress = computed(() => {
    const address =
      team.data.value?.safeAddress ??
      contracts.value.find((contract) => contract.type === 'Safe')?.address

    return address ? normalizeSafeAddress(address) : undefined
  })

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

  // ── Backend DB: off-chain enrichment and JournalEntry account assignments ──
  const weeklyClaims = useGetTeamWeeklyClaimsQuery({ queryParams: { teamId } })
  const expenses = useGetExpensesQuery({ queryParams: { teamId } })
  const accountAssignments = useGetJournalAccountAssignmentsQuery({ queryParams: { teamId } })

  // ── Safe service: incoming + outgoing transfers (optional / flaky — never blocks) ──
  const safeTransfers = useGetSafeIncomingTransfersQuery({
    pathParams: { safeAddress },
    queryParams: { limit: SAFE_PAGE_SIZE }
  })
  const safeOutgoing = useGetSafeOutgoingTransactionsQuery({
    pathParams: { safeAddress },
    queryParams: { limit: SAFE_PAGE_SIZE }
  })

  // Source feeds are first mapped with the explicit override when supplied, or
  // with the zero-rate gap. This produces the token/date request set without
  // running the source mappers twice.
  const baseInput = computed<CncAccountingInput>(() => ({
    contracts: allContracts.value,
    safeAddress: safeAddress.value,
    sherTokenAddress: options.sherTokenAddress ?? (investorAddress.value || null),
    currentSherMultiplier: currentSherMultiplier.value,
    ...(options.rateOfRecord ? { rateOfRecord: options.rateOfRecord } : {}),
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
    accountAssignments: accountAssignments.data.value
  }))

  const provisionalDrafts = computed(() => buildCncJournalEntryDrafts(baseInput.value))
  const historicalTargets = computed(() =>
    accountingValuation.historicalRateTargets(provisionalDrafts.value)
  )
  const historicalRates = useHistoricalTokenRatesQuery(
    historicalTargets,
    () => !options.rateOfRecord
  )

  // Native (POL/ETH) is valued from the immutable UTC transaction-date snapshot.
  // Stablecoins retain their $1 peg and SHER retains the multiplier policy applied
  // by `buildCncJournalEntryDrafts`. Missing market data stamps a zero rate but never
  // removes the evidenced token movement; completeness reports the gap.
  // Mapper-provided instances are accepted only when they name a known company
  // deployment. Receipt Transfer logs may complete a missing instance; activity
  // order and unrelated historical deployments are never used as a fallback.
  const drafts = computed(() =>
    options.rateOfRecord
      ? provisionalDrafts.value
      : accountingValuation.applyHistoricalRates(
          provisionalDrafts.value,
          historicalRates.rateOfRecord
        )
  )
  const deploymentAccounts = computed(() => knownDeploymentAccounts(allContracts.value))
  const transactionEvidence = useTransactionEvidence(drafts, deploymentAccounts)
  const accounting = computed<CncAccounting>(() =>
    assembleWithAccountEvidence(
      drafts.value,
      deploymentAccounts.value,
      transactionEvidence.accountEvidence.value,
      baseInput.value.accountAssignments
    )
  )

  const eventSources = [
    accountingEventSource('bank-events', 'Bank history', bankTargets, bank),
    accountingEventSource('payroll-events', 'Payroll history', cashRemTargets, cashRem),
    accountingEventSource('expense-events', 'Expense history', expenseTargets, expense),
    accountingEventSource(
      'credit-events',
      'Community Credit history',
      fixedReturnTargets,
      fixedReturn
    ),
    accountingEventSource('investor-events', 'Investor history', investorTargets, investor),
    accountingEventSource('vesting-events', 'Vesting history', vestingTargets, vesting),
    accountingEventSource(
      'safe-deposit-router-events',
      'Safe deposit history',
      routerTargets,
      router
    )
  ]

  const hasTeamId = () => Boolean(toValue(teamId))
  const hasSafe = () => Boolean(safeAddress.value)
  const sourceDefinitions = [
    accountingQuerySource('company', 'Company', hasTeamId, team, { fatal: true }),
    accountingQuerySource('contract-history', 'Contract deployment history', hasTeamId, officers),
    accountingQuerySource(
      'credit-terms',
      'Community Credit terms',
      () => Boolean(fixedReturnAddress.value),
      fixedReturnOffers
    ),
    accountingQuerySource(
      'safe-incoming-transfers',
      'Safe incoming transfers',
      hasSafe,
      safeTransfers
    ),
    accountingQuerySource(
      'safe-outgoing-transactions',
      'Safe outgoing transactions',
      hasSafe,
      safeOutgoing
    ),
    accountingQuerySource('weekly-claims', 'Weekly claims', hasTeamId, weeklyClaims),
    accountingQuerySource('expenses', 'Approved expenses', hasTeamId, expenses),
    accountingQuerySource(
      'account-assignments',
      'Journal account assignments',
      hasTeamId,
      accountAssignments
    ),
    accountingQuerySource(
      'sher-multiplier',
      'SHER multiplier',
      () => Boolean(routerAddress.value),
      routerMultiplier
    ),
    accountingQuerySource(
      'transaction-receipts',
      'Transaction receipt evidence',
      () => transactionEvidence.isApplicable.value,
      transactionEvidence,
      {
        partialReason: () =>
          transactionEvidence.unavailableOperationIds.value.length
            ? 'Some required transaction receipts could not be loaded.'
            : undefined
      }
    )
  ]

  const status = useAccountingStatus({
    sources: sourceDefinitions,
    eventSources,
    reconciliation: {
      unmatchedFeeOperationIds: computed(() => accounting.value.unmatchedFeeOperationIds),
      unavailableReceiptOperationIds: transactionEvidence.unavailableOperationIds
    },
    rates: {
      drafts,
      isLoading: historicalRates.isLoading
    }
  })

  const refetch = (): Promise<unknown> =>
    Promise.allSettled([
      ...[...sourceDefinitions, ...eventSources].map(({ query }) => query.refetch?.()),
      historicalRates.refetch()
    ])

  return { journal: computed(() => accounting.value.journal), status, refetch }
}
