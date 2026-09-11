/** Reactive completeness and typed diagnostics for the Accounting source registry. */
import { computed, type ComputedRef } from 'vue'
import { isUsdPegged } from '@/utils/accounting/toUsd'
import { accountingCompletenessOf } from '@/utils/accounting/accountingCompleteness'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type {
  AccountingDiagnostic,
  AccountingSourceId,
  AccountingSourceStatus
} from '@/utils/accounting/types'
import type { TokenId } from '@/constant'

interface ReactiveValue<T> {
  readonly value: T
}

interface QueryAvailability {
  loading?: ReactiveValue<boolean>
  isLoading?: ReactiveValue<boolean>
  isPending?: ReactiveValue<boolean>
  error?: ReactiveValue<unknown>
  refetch?: () => Promise<unknown>
}

interface EventGap {
  address: string
}

interface TimestampGap {
  transactionHash: string | null
  blockNumber: bigint | null
}

interface EventFeedAvailability extends QueryAvailability {
  gaps?: ReactiveValue<readonly EventGap[]>
  timestampGaps?: ReactiveValue<readonly TimestampGap[]>
}

export interface AccountingSourceDefinition {
  source: AccountingSourceId
  label: string
  applicable: () => boolean
  query: QueryAvailability
  fatal?: boolean
  partialReason?: () => string | undefined
}

export interface AccountingEventSourceDefinition extends Omit<
  AccountingSourceDefinition,
  'query' | 'partialReason'
> {
  query: EventFeedAvailability
}

export function accountingQuerySource(
  source: AccountingSourceId,
  label: string,
  applicable: () => boolean,
  query: QueryAvailability,
  policy: Pick<AccountingSourceDefinition, 'fatal' | 'partialReason'> = {}
): AccountingSourceDefinition {
  return { source, label, applicable, query, ...policy }
}

export function accountingEventSource(
  source: AccountingSourceId,
  label: string,
  targets: ReactiveValue<readonly unknown[]>,
  query: EventFeedAvailability
): AccountingEventSourceDefinition {
  return { source, label, applicable: () => targets.value.length > 0, query }
}

interface AccountingStatusInput {
  sources: readonly AccountingSourceDefinition[]
  eventSources: readonly AccountingEventSourceDefinition[]
  reconciliation: {
    unmatchedFeeOperationIds: ReactiveValue<readonly string[]>
    unavailableReceiptOperationIds: ReactiveValue<readonly string[]>
  }
  rates: {
    rawEntries: ReactiveValue<readonly LedgerEntry[]>
    isLoading: ReactiveValue<boolean>
  }
}

export interface AccountingStatus {
  /** Overall evidence completeness; only `ready` represents final books. */
  state: ComputedRef<'ready' | 'loading' | 'partial' | 'failed'>
  /** Availability of every material source used to assemble the journal. */
  sources: ComputedRef<readonly AccountingSourceStatus[]>
  /** Typed reasons why source evidence or reconciliation is incomplete. */
  diagnostics: ComputedRef<readonly AccountingDiagnostic[]>
  /** True while any applicable material source is still loading. */
  isLoading: ComputedRef<boolean>
}

function availabilityOf(definition: AccountingSourceDefinition): AccountingSourceStatus {
  const { source, label } = definition
  if (!definition.applicable()) return { source, label, state: 'not-applicable' }

  const loading =
    definition.query.loading?.value ||
    definition.query.isLoading?.value ||
    definition.query.isPending?.value
  if (loading) return { source, label, state: 'loading' }

  if (definition.query.error?.value) {
    return {
      source,
      label,
      state: definition.fatal ? 'failed' : 'partial',
      reason: `${label} could not be loaded.`
    }
  }

  const partialReason = definition.partialReason?.()
  return partialReason
    ? { source, label, state: 'partial', reason: partialReason }
    : { source, label, state: 'ready' }
}

function eventPartialReason(feed: EventFeedAvailability): string | undefined {
  const gaps = (feed.gaps?.value.length ?? 0) + (feed.timestampGaps?.value.length ?? 0)
  return gaps ? `${gaps} event evidence gap${gaps === 1 ? '' : 's'} detected.` : undefined
}

function monetaryNonPeggedTokens(entries: readonly LedgerEntry[]): TokenId[] {
  return [
    ...new Set(
      entries
        .filter(
          (entry) =>
            (entry.debit !== null || entry.credit !== null) &&
            BigInt(entry.rawAmount) !== 0n &&
            !isUsdPegged(entry.token)
        )
        .map((entry) => entry.token)
    )
  ]
}

/** Derive one source-of-truth status object without loading or remapping source data. */
export function useAccountingStatus(input: AccountingStatusInput): AccountingStatus {
  const eventSources: AccountingSourceDefinition[] = input.eventSources.map((definition) => ({
    ...definition,
    partialReason: () => eventPartialReason(definition.query)
  }))
  const definitions = [...input.sources, ...eventSources]
  const nonPeggedTokens = computed(() => monetaryNonPeggedTokens(input.rates.rawEntries.value))
  const unavailableRateTokens = computed(() =>
    monetaryNonPeggedTokens(
      input.rates.rawEntries.value.filter((entry) => !entry.rate || entry.rate <= 0)
    )
  )

  const sources = computed<readonly AccountingSourceStatus[]>(() => {
    const statuses = definitions.map(availabilityOf)
    const rateLoading = input.rates.isLoading.value && unavailableRateTokens.value.length > 0
    const rateStatus: AccountingSourceStatus = !nonPeggedTokens.value.length
      ? { source: 'token-rates', label: 'Token USD rates', state: 'not-applicable' }
      : rateLoading
        ? { source: 'token-rates', label: 'Token USD rates', state: 'loading' }
        : unavailableRateTokens.value.length
          ? {
              source: 'token-rates',
              label: 'Token USD rates',
              state: 'partial',
              reason: 'One or more token rates are unavailable.'
            }
          : { source: 'token-rates', label: 'Token USD rates', state: 'ready' }
    return [...statuses, rateStatus]
  })

  const diagnostics = computed<readonly AccountingDiagnostic[]>(() => [
    ...definitions
      .filter((definition) => definition.applicable() && Boolean(definition.query.error?.value))
      .map(
        (definition): AccountingDiagnostic => ({
          kind: 'source-unavailable',
          source: definition.source
        })
      ),
    ...input.eventSources.flatMap(({ source, query }) => [
      ...(query.gaps?.value ?? []).map(
        (gap): AccountingDiagnostic => ({
          kind: 'source-scan-failed',
          source,
          address: gap.address
        })
      ),
      ...(query.timestampGaps?.value ?? []).map(
        (gap): AccountingDiagnostic => ({
          kind: 'block-timestamp-unavailable',
          source,
          ...(gap.transactionHash ? { txHash: gap.transactionHash } : {}),
          ...(gap.blockNumber == null ? {} : { blockNumber: gap.blockNumber.toString() })
        })
      )
    ]),
    ...input.reconciliation.unmatchedFeeOperationIds.value.map(
      (txHash): AccountingDiagnostic => ({ kind: 'orphan-bank-fee', txHash })
    ),
    ...input.reconciliation.unavailableReceiptOperationIds.value.map(
      (txHash): AccountingDiagnostic => ({ kind: 'receipt-unavailable', txHash })
    ),
    ...unavailableRateTokens.value.map(
      (token): AccountingDiagnostic => ({ kind: 'rate-unavailable', token })
    )
  ])

  const state = computed(() => accountingCompletenessOf(sources.value))
  return {
    state,
    sources,
    diagnostics,
    isLoading: computed(() => state.value === 'loading')
  }
}
