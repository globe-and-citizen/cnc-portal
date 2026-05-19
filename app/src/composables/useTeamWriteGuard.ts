import { useTeamStore } from '@/stores'
import type { Team } from '@/types/team'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export const TEAM_ARCHIVED_TOOLTIP = 'This team is archived'

/**
 * Reactive guard for team-scoped write UI when the current (or supplied) team is archived.
 */
export function useTeamWriteGuard(teamRef?: MaybeRefOrGetter<Team | null | undefined>) {
  const teamStore = useTeamStore()

  const team = computed(() => toValue(teamRef) ?? toValue(teamStore.currentTeamMeta.data))

  const isTeamArchived = computed(() => team.value?.isArchived === true)

  const isWriteDisabled = computed(() => isTeamArchived.value)

  const archivedTooltip = computed(() =>
    isTeamArchived.value ? TEAM_ARCHIVED_TOOLTIP : undefined
  )

  const mergeWriteDisabled = (disabled?: MaybeRefOrGetter<boolean>) =>
    computed(() => Boolean(toValue(disabled)) || isWriteDisabled.value)

  return {
    team,
    isTeamArchived,
    isWriteDisabled,
    archivedTooltip,
    mergeWriteDisabled
  }
}
