<template>
  <UModal
    v-model:open="showVisibilityTeamConfirmModal"
    :title="companyIsShown ? 'Hide Company' : 'Show Company'"
    :description="
      companyIsShown
        ? 'This action will hide the company from your dashboard only.'
        : 'This action will show the company on your dashboard again.'
    "
  >
    <UButton
      size="sm"
      :color="companyIsShown ? 'success' : 'warning'"
      :icon="companyIsShown ? 'i-lucide-eye-off' : 'i-lucide-eye'"
      :label="companyIsShown ? 'Hide' : 'Show'"
      data-test="team-meta-visibility-open"
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
        Are you sure you want to {{ companyIsShown ? 'hide' : 'show' }} the company
        <span class="font-bold">{{ currentTeam?.name }}</span
        >?
      </p>
      <div class="mt-4 flex justify-center gap-2">
        <UButton
          :color="companyIsShown ? 'success' : 'error'"
          data-test="visibility-team-button"
          @click="companyIsShown ? hideTeam() : showTeam()"
          :loading="teamIsUpdating"
          :disabled="teamIsUpdating"
          :label="companyIsShown ? 'Hide' : 'Show'"
        />
        <UButton
          color="primary"
          variant="outline"
          @click="showVisibilityTeamConfirmModal = false"
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

const showVisibilityTeamConfirmModal = ref(false)
const teamStore = useTeamStore()
const toast = useToast()

const {
  isPending: teamIsUpdating,
  error: updateTeamError,
  mutate: updateTeamMutate,
  reset
} = useUpdateTeamMutation()

const companyIsShown = computed(() => !(props.currentTeam?.isHidden ?? false))

function getRequiredTeamId(): string | null {
  const teamId = teamStore.currentTeamId
  if (!teamId) {
    toast.add({ title: 'Company ID is required', color: 'error' })
    return null
  }
  return String(teamId)
}

function hideTeam() {
  const teamId = getRequiredTeamId()
  if (!teamId) return
  updateTeamMutate(
    { pathParams: { id: teamId }, body: { isHidden: true } },
    {
      onSuccess: () => {
        toast.add({ title: 'Company hidden successfully', color: 'success' })
        showVisibilityTeamConfirmModal.value = false
        reset()
      }
    }
  )
}

function showTeam() {
  const teamId = getRequiredTeamId()
  if (!teamId) return
  updateTeamMutate(
    { pathParams: { id: teamId }, body: { isHidden: false } },
    {
      onSuccess: () => {
        toast.add({ title: 'Company is visible again', color: 'success' })
        showVisibilityTeamConfirmModal.value = false
        reset()
      }
    }
  )
}
</script>
