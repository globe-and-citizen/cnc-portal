import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useUpdateTeamMutation, useDeleteTeamMutation } from '@/queries/team.queries'
import type { Team } from '@/types'

export type CompanyAction = 'update' | 'archive' | 'hide' | 'delete'

export interface CompanyActionPayload {
  teamId: string
  action: CompanyAction
}

/**
 * Encapsulates the row/card actions of the Companies list. `hide` runs inline;
 * `archive`/`delete` go through a confirm dialog; `update` defers to the caller
 * (navigation). All API calls reuse the shared team mutations so the request
 * path stays identical to the TeamMeta* modals.
 */
export function useCompanyActions(
  teams: MaybeRefOrGetter<Team[] | undefined>,
  opts: { onUpdate: (teamId: string) => void }
) {
  const toast = useToast()
  const activeTeam = ref<Team | null>(null)
  const confirmKind = ref<'archive' | 'delete' | null>(null)
  const confirmOpen = ref(false)

  const {
    isPending: updatePending,
    error: updateError,
    mutate: updateTeamMutate,
    reset: resetUpdate
  } = useUpdateTeamMutation()
  const {
    isPending: deletePending,
    error: deleteError,
    mutate: deleteTeamMutate,
    reset: resetDelete
  } = useDeleteTeamMutation()

  const confirmLoading = computed(() =>
    confirmKind.value === 'delete' ? deletePending.value : updatePending.value
  )
  const confirmErrorMessage = computed(() => {
    const err = confirmKind.value === 'delete' ? deleteError.value : updateError.value
    return err ? err.message : ''
  })

  function findTeam(teamId: string): Team | undefined {
    return (toValue(teams) ?? []).find((team) => String(team.id) === String(teamId))
  }

  function handleAction({ teamId, action }: CompanyActionPayload) {
    if (action === 'update') {
      opts.onUpdate(teamId)
      return
    }
    if (action === 'hide') {
      updateTeamMutate(
        { pathParams: { id: teamId }, body: { isHidden: true } },
        { onSuccess: () => toast.add({ title: 'Company hidden', color: 'success' }) }
      )
      return
    }
    activeTeam.value = findTeam(teamId) ?? null
    confirmKind.value = action
    confirmOpen.value = true
  }

  function onConfirmOpenChange(value: boolean) {
    confirmOpen.value = value
    if (!value) {
      confirmKind.value = null
      activeTeam.value = null
      resetUpdate()
      resetDelete()
    }
  }

  function onConfirm() {
    const team = activeTeam.value
    if (!team) return
    const teamId = String(team.id)
    if (confirmKind.value === 'archive') {
      updateTeamMutate(
        { pathParams: { id: teamId }, body: { isArchived: true } },
        {
          onSuccess: () => {
            toast.add({ title: 'Company archived', color: 'success' })
            onConfirmOpenChange(false)
          }
        }
      )
    } else if (confirmKind.value === 'delete') {
      deleteTeamMutate(
        { pathParams: { teamId } },
        {
          onSuccess: () => {
            toast.add({ title: 'Company deleted', color: 'success' })
            onConfirmOpenChange(false)
          }
        }
      )
    }
  }

  return {
    activeTeam,
    confirmKind,
    confirmOpen,
    confirmLoading,
    confirmErrorMessage,
    handleAction,
    onConfirmOpenChange,
    onConfirm
  }
}
