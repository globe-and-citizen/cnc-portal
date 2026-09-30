import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { JournalAccountAssignmentRecord } from '@/types/journal-account-assignment'
import type { AccountId } from '@/utils/accounting/types'
import { createMutationHook, createQueryHook, queryPresets } from './queryFactory'

export const journalAccountAssignmentKeys = {
  all: ['journal-account-assignments'] as const,
  lists: () => [...journalAccountAssignmentKeys.all, 'list'] as const,
  list: (teamId: string | null) => [...journalAccountAssignmentKeys.lists(), { teamId }] as const
}

export interface GetJournalAccountAssignmentsParams {
  queryParams: {
    teamId: MaybeRefOrGetter<string | null>
  }
}

/** Fetch every account assignment for a team's JournalEntries. */
export const useGetJournalAccountAssignmentsQuery = createQueryHook<
  JournalAccountAssignmentRecord[],
  GetJournalAccountAssignmentsParams
>({
  endpoint: 'accounting/account-assignment',
  queryKey: (params) => journalAccountAssignmentKeys.list(toValue(params.queryParams.teamId)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: queryPresets.moderate
})

export interface UpsertJournalAccountAssignmentParams {
  body: {
    teamId: string | number
    journalEntryId: string
    accountId: AccountId
    memo?: string
  }
}

/** Assign one allowed counter-account to a transaction-backed JournalEntry. */
export const useUpsertJournalAccountAssignmentMutation = createMutationHook<
  JournalAccountAssignmentRecord,
  UpsertJournalAccountAssignmentParams
>({
  method: 'PUT',
  endpoint: 'accounting/account-assignment',
  invalidateKeys: [journalAccountAssignmentKeys.all]
})

export interface DeleteJournalAccountAssignmentParams {
  queryParams: {
    teamId: string | number
    journalEntryId: string
  }
}

/** Remove an assignment so the JournalEntry returns to its inferred account. */
export const useDeleteJournalAccountAssignmentMutation = createMutationHook<
  { success: boolean },
  DeleteJournalAccountAssignmentParams
>({
  method: 'DELETE',
  endpoint: 'accounting/account-assignment',
  invalidateKeys: [journalAccountAssignmentKeys.all]
})
