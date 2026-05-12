<template>
  <UModal
    v-model:open="showArchiveTeamConfirmModal"
    :title="isArchived ? 'Unarchive Company' : 'Archive Company'"
    :description="
      isArchived
        ? 'This action will make the company visible and usable again.'
        : 'This action will remove the company from the dashboard and prevent it from being used.'
    "
  >
    <UButton
      size="sm"
      :color="isArchived ? 'success' : 'warning'"
      :icon="isArchived ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
      :label="isArchived ? 'Unarchive' : 'Archive'"
      data-test="team-meta-archive-open"
    />
    <template #body>
      <UAlert
        v-if="updateTeamError"
        color="error"
        variant="soft"
        :description="updateTeamError.message"
        class="mb-4"
      />
      <p>
        Are you sure you want to {{ isArchived ? 'unarchive' : 'archive' }} the company
        <span class="font-bold">{{ currentTeam?.name }}</span
        >?
      </p>
      <div class="mt-4 flex justify-center gap-2">
        <UButton
          :color="isArchived ? 'success' : 'error'"
          data-test="archive-team-button"
          @click="isArchived ? unarchiveTeam() : archiveTeam()"
          :loading="teamIsUpdating"
          :disabled="teamIsUpdating"
          :label="isArchived ? 'Unarchive' : 'Archive'"
        />
        <UButton
          color="primary"
          variant="outline"
          @click="showArchiveTeamConfirmModal = false"
          label="Cancel"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Team } from '@/types/team'
import { useTeamStore } from '@/stores'
import { useUpdateTeamMutation } from '@/queries/team.queries'

const props = defineProps<{
  currentTeam: Team | null | undefined
}>()

const showArchiveTeamConfirmModal = ref(false)
const teamStore = useTeamStore()
const toast = useToast()

const {
  isPending: teamIsUpdating,
  error: updateTeamError,
  mutate: updateTeamMutate,
  reset
} = useUpdateTeamMutation()

const isArchived = computed(() =>
  Boolean(props.currentTeam?.isArchived ?? props.currentTeam?.archived)
)

function getRequiredTeamId(): string | null {
  const teamId = teamStore.currentTeamId
  if (!teamId) {
    toast.add({ title: 'Company ID is required', color: 'error' })
    return null
  }
  return String(teamId)
}

function archiveTeam() {
  const teamId = getRequiredTeamId()
  if (!teamId) return
  updateTeamMutate(
    { pathParams: { id: teamId }, body: { isArchived: true } },
    {
      onSuccess: () => {
        toast.add({ title: 'Company archived successfully', color: 'success' })
        showArchiveTeamConfirmModal.value = false
        reset()
      }
    }
  )
}

function unarchiveTeam() {
  const teamId = getRequiredTeamId()
  if (!teamId) return
  updateTeamMutate(
    { pathParams: { id: teamId }, body: { isArchived: false } },
    {
      onSuccess: () => {
        toast.add({ title: 'Company unarchived successfully', color: 'success' })
        showArchiveTeamConfirmModal.value = false
        reset()
      }
    }
  )
}
</script>
