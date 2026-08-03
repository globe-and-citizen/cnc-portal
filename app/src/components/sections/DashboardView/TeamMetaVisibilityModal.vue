<template>
  <UModal
    v-model:open="open"
    :title="companyIsShown ? 'Hide Company' : 'Show Company'"
    :description="
      companyIsShown
        ? 'This action will hide the company from your dashboard only.'
        : 'This action will show the company on your dashboard again.'
    "
  >
    <template v-if="withTrigger" #default>
      <UButton
        size="sm"
        :color="companyIsShown ? 'success' : 'warning'"
        :icon="companyIsShown ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :label="companyIsShown ? 'Hide' : 'Show'"
        data-test="team-meta-visibility-open"
      />
    </template>
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
        <UButton color="primary" variant="outline" @click="open = false" label="Cancel" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Team } from '@/types/team'
import { useTeamStore } from '@/stores'
import { useUpdateTeamMutation } from '@/queries/team.queries'

const props = withDefaults(
  defineProps<{
    currentTeam: Team | null | undefined
    /**
     * Team to act on when it is not the one the dashboard has open — the teams
     * list drives this modal per card, where `teamStore.currentTeamId` is stale.
     */
    teamId?: string | number | null
    /** Clear it when the parent opens the modal itself and owns the trigger. */
    withTrigger?: boolean
  }>(),
  { teamId: null, withTrigger: true }
)

const open = defineModel<boolean>('open', { default: false })
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
  const teamId = props.teamId ?? teamStore.currentTeamId
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
        open.value = false
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
        open.value = false
        reset()
      }
    }
  )
}
</script>
