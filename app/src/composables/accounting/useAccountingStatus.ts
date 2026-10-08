/** Reactive completeness and typed diagnostics for the Accounting source registry. */
import { computed, type ComputedRef } from 'vue'
import { accountingCompletenessOf } from '@/utils/accounting/accountingCompleteness'
import type { JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import type { AccountingDiagnostic, AccountingSourceStatus } from '@/utils/accounting/types'

import {
  availabilityOf,
  eventPartialReason,
  monetaryNonPeggedTokens,
  type ReactiveValue,
  type AccountingSourceDefinition,
  type AccountingEventSourceDefinition
} from '@/utils/accounting/sourceStatus'

interface AccountingStatusInput {
  sources: readonly AccountingSourceDefinition[]
  eventSources: readonly AccountingEventSourceDefinition[]
  reconciliation: {
    assetDiagnostics?: ReactiveValue<readonly AccountingDiagnostic[]>
    unmatchedFeeOperationIds: ReactiveValue<readonly string[]>
    unavailableReceiptOperationIds: ReactiveValue<readonly string[]>
  }
  rates: {
    drafts: ReactiveValue<readonly JournalEntryDraft[]>
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

/** Derive one source-of-truth status object without loading or remapping source data. */
export function useAccountingStatus(input: AccountingStatusInput): AccountingStatus {
  const eventSources: AccountingSourceDefinition[] = input.eventSources.map((definition) => ({
    ...definition,
    partialReason: () => eventPartialReason(definition.query)
  }))
  const definitions = [...input.sources, ...eventSources]
  const nonPeggedTokens = computed(() => monetaryNonPeggedTokens(input.rates.drafts.value))
  const unavailableRateTokens = computed(() =>
    monetaryNonPeggedTokens(
      input.rates.drafts.value.filter((entry) => !entry.rate || entry.rate <= 0)
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
    const assetGaps = input.reconciliation.assetDiagnostics?.value ?? []
    return [
      ...statuses,
      rateStatus,
      ...(assetGaps.length
        ? [
            {
              source: 'safe-transfers' as const,
              label: 'Safe asset reconciliation',
              state: 'partial' as const,
              reason: 'Asset identity, carrying basis, or classification needs verification.'
            }
          ]
        : [])
    ]
  })

  const diagnostics = computed<readonly AccountingDiagnostic[]>(() => [
    ...(input.reconciliation.assetDiagnostics?.value ?? []),
    ...definitions
      .filter((definition) => definition.applicable() && Boolean(definition.query.error?.value))
      .map(
        (definition): AccountingDiagnostic => ({
          kind: 'source-unavailable',
          source: definition.source
        })
      ),
    ...input.eventSources.flatMap(({ source, query }) => [
      ...(query.data?.value?.gaps ?? []).map(
        (gap): AccountingDiagnostic => ({
          kind: 'source-scan-failed',
          source,
          address: gap.address
        })
      ),
      ...(query.data?.value?.timestampGaps ?? []).map(
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
