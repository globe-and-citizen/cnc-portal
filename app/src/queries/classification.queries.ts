import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { TransactionClassificationRecord } from '@/types/accounting-classification'
import type { ClassificationCategory } from '@/utils/accounting/classification'
import { createQueryHook, createMutationHook, queryPresets } from './queryFactory'

/**
 * Query hooks for manual Bank/Safe transaction classifications (issue #2457).
 * One hook per HTTP method on `/accounting/classification`, per the query guide.
 */
export const classificationKeys = {
  all: ['transaction-classifications'] as const,
  lists: () => [...classificationKeys.all, 'list'] as const,
  list: (teamId: string | null) => [...classificationKeys.lists(), { teamId }] as const
}

// ============================================================================
// GET /accounting/classification - list a team's classifications
// ============================================================================

export interface GetClassificationsParams {
  queryParams: {
    /** Team ID whose classifications to fetch. */
    teamId: MaybeRefOrGetter<string | null>
  }
}

/**
 * Fetch every manual classification for a team.
 *
 * @endpoint GET /accounting/classification
 * @queryParams { teamId: string }
 */
export const useGetClassificationsQuery = createQueryHook<
  TransactionClassificationRecord[],
  GetClassificationsParams
>({
  endpoint: 'accounting/classification',
  queryKey: (params) => classificationKeys.list(toValue(params.queryParams.teamId)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: queryPresets.moderate
})

// ============================================================================
// PUT /accounting/classification - create or update (upsert) a classification
// ============================================================================

export interface UpsertClassificationBody {
  teamId: string | number
  /** Stable transaction identity `${txHash}-${logIndex}`. */
  txId: string
  category: ClassificationCategory
  /** Optional free-text note; omitting it clears any existing memo. */
  memo?: string
}

export interface UpsertClassificationParams {
  body: UpsertClassificationBody
}

/**
 * Create or update the classification of one transaction (team owner only).
 *
 * @endpoint PUT /accounting/classification
 * @body UpsertClassificationBody
 */
export const useUpsertClassificationMutation = createMutationHook<
  TransactionClassificationRecord,
  UpsertClassificationParams
>({
  method: 'PUT',
  endpoint: 'accounting/classification',
  invalidateKeys: [classificationKeys.all]
})

// ============================================================================
// DELETE /accounting/classification - revert to inference
// ============================================================================

export interface DeleteClassificationParams {
  queryParams: {
    teamId: string | number
    /** Stable transaction identity `${txHash}-${logIndex}`. */
    txId: string
  }
}

/**
 * Remove a classification so the transaction falls back to address inference
 * (team owner only).
 *
 * @endpoint DELETE /accounting/classification
 * @queryParams { teamId: string, txId: string }
 */
export const useDeleteClassificationMutation = createMutationHook<
  { success: boolean },
  DeleteClassificationParams
>({
  method: 'DELETE',
  endpoint: 'accounting/classification',
  invalidateKeys: [classificationKeys.all]
})
