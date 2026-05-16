<template>
  <UModal
    v-model:open="showDeleteTeamConfirmModal"
    title="Confirmation"
    description="This action cannot be undone. Please confirm that you want to permanently delete this company."
  >
    <UButton
      size="sm"
      color="error"
      icon="i-lucide-trash"
      label="Delete"
      data-test="team-meta-delete-open"
    />
    <template #body>
      <UAlert
        v-if="deleteTeamError"
        color="error"
        variant="soft"
        :description="deleteTeamError.message"
        class="mb-4"
      />
      <p>
        Are you sure you want to delete the company
        <span class="font-bold">{{ currentTeam?.name }}</span
        >?
      </p>
      <div class="mt-4 flex justify-center gap-2">
        <UButton
          color="error"
          data-test="delete-team-button"
          @click="deleteTeam()"
          :loading="teamIsDeleting"
          :disabled="teamIsDeleting"
          label="Delete"
        />
        <UButton
          color="primary"
          variant="outline"
          @click="showDeleteTeamConfirmModal = false"
          label="Cancel"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Team } from '@/types/team'
import { useRouter } from 'vue-router'
import { useTeamStore } from '@/stores'
import { useDeleteTeamMutation } from '@/queries/team.queries'

defineProps<{
  currentTeam: Team | null | undefined
}>()

const showDeleteTeamConfirmModal = ref(false)
const teamStore = useTeamStore()
const router = useRouter()
const toast = useToast()

const {
  mutate: deleteTeamMutate,
  isPending: teamIsDeleting,
  error: deleteTeamError
} = useDeleteTeamMutation()

function getRequiredTeamId(): string | null {
  const teamId = teamStore.currentTeamId
  if (!teamId) {
    toast.add({ title: 'Company ID is required', color: 'error' })
    return null
  }
  return String(teamId)
}

function deleteTeam() {
  const teamId = getRequiredTeamId()
  if (!teamId) return
  deleteTeamMutate(
    { pathParams: { teamId } },
    {
      onSuccess: async () => {
        toast.add({ title: 'Company deleted successfully', color: 'success' })
        showDeleteTeamConfirmModal.value = false
        await router.push('/teams')
      }
    }
  )
}
</script>
