/** Pure source definitions and completeness projections; the composable owns reactivity. */
import { isUsdPegged } from './toUsd'
import type { JournalEntryDraft } from './journalEntryDraft'
import type { AccountingSourceId, AccountingSourceStatus } from './types'
import type { AssetId } from '@/utils/tokens/assets'

export interface ReactiveValue<T> {
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

interface EventFeedData {
  gaps: readonly EventGap[]
  timestampGaps: readonly TimestampGap[]
}

interface EventFeedAvailability extends QueryAvailability {
  data?: ReactiveValue<EventFeedData | undefined>
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

export function availabilityOf(definition: AccountingSourceDefinition): AccountingSourceStatus {
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

export function eventPartialReason(feed: EventFeedAvailability): string | undefined {
  const gaps = (feed.data?.value?.gaps.length ?? 0) + (feed.data?.value?.timestampGaps.length ?? 0)
  return gaps ? `${gaps} event evidence gap${gaps === 1 ? '' : 's'} detected.` : undefined
}

export function monetaryNonPeggedTokens(entries: readonly JournalEntryDraft[]): AssetId[] {
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
