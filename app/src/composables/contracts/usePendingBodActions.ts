import { computed, watch, type Ref } from 'vue'
import { useBodApproveAction } from '@/composables/bod/writes'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useGetBodActionsQuery } from '@/queries'
import { useTeamStore } from '@/stores'
import type { TableRow } from '@/types/table'
import { filterAndFormatActions } from '@/utils'

export function usePendingBodActions(
  row: Ref<TableRow>,
  isBodAction: Ref<boolean>,
  onApproved: () => void
) {
  const teamStore = useTeamStore()
  const { isWriteDisabled } = useTeamWriteGuard()
  const approveAction = useBodApproveAction()
  const { data: bodActions } = useGetBodActionsQuery({
    queryParams: {
      teamId: computed(() => teamStore.currentTeamId),
      isExecuted: false
    }
  })
  const formattedActions = computed(() =>
    filterAndFormatActions(
      row.value.address,
      bodActions.value,
      teamStore.currentTeam?.members || []
    )
  )
  const pendingActionsDisabled = computed(
    () => isWriteDisabled.value || !isBodAction.value || formattedActions.value.length === 0
  )

  watch(approveAction.isSuccess, (isApproved) => {
    if (isApproved) onApproved()
  })

  return {
    formattedActions,
    pendingActionsDisabled,
    isLoading: approveAction.isPending,
    approveAction: approveAction.executeApproveAction
  }
}
