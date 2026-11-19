import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import { getArchivedTeamConflictMessage } from '@/utils/errors/http'

/**
 * Reactive helper for team-scoped REST mutations: surfaces backend 409 archived-team
 * responses for UAlert (stale UI that still triggers a write).
 */
export function useArchivedTeamMutationError(error: MaybeRefOrGetter<unknown>) {
  return computed(() => getArchivedTeamConflictMessage(toValue(error)))
}
