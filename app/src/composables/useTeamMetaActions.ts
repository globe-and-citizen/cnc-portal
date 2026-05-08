import { ref } from 'vue'
import { z } from 'zod'
import { useRouter } from 'vue-router'
import { useTeamStore } from '@/stores'
import {
  useArchiveTeamMutation,
  useDeleteTeamMutation,
  useHideTeamMutation,
  useShowTeamMutation,
  useUnarchiveTeamMutation,
  useUpdateTeamMutation
} from '@/queries/team.queries'

export const useTeamMetaActions = () => {
  const showDeleteTeamConfirmModal = ref(false)
  const showArchiveTeamConfirmModal = ref(false)
  const showVisibilityTeamConfirmModal = ref(false)
  const showUpdateModal = ref(false)
  const updateTeamInput = ref({ name: '', description: '' })

  const teamStore = useTeamStore()
  const router = useRouter()
  const toast = useToast()

  const updateTeamSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters')
  })

  const { isPending: teamIsUpdating, error: updateTeamError, mutate: updateTeamMutate } =
    useUpdateTeamMutation()
  const { mutate: deleteTeamMutate, isPending: teamIsDeleting, error: deleteTeamError } =
    useDeleteTeamMutation()
  const { mutate: archiveTeamMutate, isPending: teamIsArchiving, error: archiveTeamError } =
    useArchiveTeamMutation()
  const { mutate: unarchiveTeamMutate, isPending: teamIsUnarchiving } = useUnarchiveTeamMutation()
  const { mutate: hideTeamMutate, isPending: teamIsHiding, error: hideTeamError } =
    useHideTeamMutation()
  const { mutate: showTeamMutate, isPending: teamIsShowing } = useShowTeamMutation()

  const getRequiredTeamId = (): string | null => {
    const teamId = teamStore.currentTeamId
    if (!teamId) {
      toast.add({ title: 'Company ID is required', color: 'error' })
      return null
    }
    return String(teamId)
  }

  const executeUpdateTeam = () => {
    const teamId = getRequiredTeamId()
    if (!teamId) return
    updateTeamMutate(
      { pathParams: { id: teamId }, body: { ...updateTeamInput.value } },
      {
        onSuccess: () => {
          toast.add({ title: 'Company updated successfully', color: 'success' })
          showUpdateModal.value = false
        }
      }
    )
  }

  const deleteTeam = async () => {
    const teamId = getRequiredTeamId()
    if (!teamId) return
    deleteTeamMutate(
      { pathParams: { teamId } },
      {
        onSuccess: async () => {
          toast.add({ title: 'Company deleted successfully', color: 'success' })
          showDeleteTeamConfirmModal.value = false
          router.push('/teams')
        }
      }
    )
  }

  const archiveTeam = async () => {
    const teamId = getRequiredTeamId()
    if (!teamId) return
    archiveTeamMutate(
      { pathParams: { id: teamId }, body: { isArchived: true } },
      {
        onSuccess: async () => {
          toast.add({ title: 'Company archived successfully', color: 'success' })
          showArchiveTeamConfirmModal.value = false
        }
      }
    )
  }

  const unarchiveTeam = async () => {
    const teamId = getRequiredTeamId()
    if (!teamId) return
    unarchiveTeamMutate(
      { pathParams: { id: teamId }, body: { isArchived: false } },
      {
        onSuccess: async () => {
          toast.add({ title: 'Company unarchived successfully', color: 'success' })
          showArchiveTeamConfirmModal.value = false
        }
      }
    )
  }

  const hideTeam = async () => {
    const teamId = getRequiredTeamId()
    if (!teamId) return
    hideTeamMutate(
      { pathParams: { id: teamId }, body: { isVisible: false } },
      {
        onSuccess: async () => {
          toast.add({ title: 'Company hidden successfully', color: 'success' })
          showVisibilityTeamConfirmModal.value = false
        }
      }
    )
  }

  const showTeam = async () => {
    const teamId = getRequiredTeamId()
    if (!teamId) return
    showTeamMutate(
      { pathParams: { id: teamId }, body: { isVisible: true } },
      {
        onSuccess: async () => {
          toast.add({ title: 'Company is visible again', color: 'success' })
          showVisibilityTeamConfirmModal.value = false
        }
      }
    )
  }

  const prefillUpdateForm = () => {
    const currentTeam = teamStore.currentTeamMeta.data
    updateTeamInput.value.name = currentTeam?.name || ''
    updateTeamInput.value.description = currentTeam?.description || ''
  }

  return {
    showDeleteTeamConfirmModal,
    showArchiveTeamConfirmModal,
    showVisibilityTeamConfirmModal,
    showUpdateModal,
    updateTeamInput,
    updateTeamSchema,
    teamIsUpdating,
    updateTeamError,
    teamIsDeleting,
    deleteTeamError,
    teamIsArchiving,
    archiveTeamError,
    teamIsUnarchiving,
    teamIsHiding,
    hideTeamError,
    teamIsShowing,
    executeUpdateTeam,
    deleteTeam,
    archiveTeam,
    unarchiveTeam,
    hideTeam,
    showTeam,
    prefillUpdateForm
  }
}
