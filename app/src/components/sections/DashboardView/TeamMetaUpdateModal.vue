<template>
  <UModal
    v-model:open="open"
    title="Update Company Details"
    description="Update your company name and description to keep your profile current and accurate"
  >
    <template v-if="withTrigger" #default>
      <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
        <UButton
          size="sm"
          color="secondary"
          icon="i-lucide-edit"
          label="Update"
          data-test="team-meta-update-open"
          :disabled="archivedDisabled"
        />
      </TeamArchivedTooltip>
    </template>
    <template #body>
      <UAlert
        v-if="archivedTeamErrorMessage"
        color="warning"
        variant="soft"
        :description="archivedTeamErrorMessage"
        class="mb-4"
      />
      <UAlert
        v-else-if="updateTeamError"
        color="error"
        variant="soft"
        :description="getAxiosErrorMessage(updateTeamError, 'Failed to update company')"
        class="mb-4"
      />
      <UForm
        :schema="updateTeamSchema"
        :state="updateTeamInput"
        @submit="executeUpdateTeam"
        class="flex flex-col gap-5"
      >
        <UFormField
          name="name"
          label="Company Name"
          help="Give your company a unique, recognizable name"
          required
        >
          <UInput v-model="updateTeamInput.name" placeholder="Acme Corp" class="w-full" />
        </UFormField>
        <UFormField
          name="description"
          label="Description"
          help="Briefly describe your company's purpose"
          :hint="`${updateTeamInput.description.length} / 200`"
        >
          <UTextarea
            v-model="updateTeamInput.description"
            placeholder="Enter a short description"
            class="w-full"
            :rows="3"
          />
        </UFormField>
        <div class="flex justify-end">
          <UButton
            type="submit"
            color="primary"
            class="w-32 justify-center"
            :loading="Boolean(teamIsUpdating)"
            :disabled="Boolean(teamIsUpdating)"
            label="Save changes"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { z } from 'zod'
import type { Team } from '@/types/team'
import { useTeamStore } from '@/stores'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import { useArchivedTeamMutationError } from '@/composables/useArchivedTeamMutationError'
import { getAxiosErrorMessage } from '@/utils/httpErrorUtil'

const props = withDefaults(
  defineProps<{
    /** Team to edit; falls back to the one the dashboard has open. */
    currentTeam?: Team | null
    /**
     * Team to act on when it is not the one the dashboard has open — the teams
     * list drives this modal per card, where `teamStore.currentTeamId` is stale.
     */
    teamId?: string | number | null
    /** Clear it when the parent opens the modal itself and owns the trigger. */
    withTrigger?: boolean
  }>(),
  { currentTeam: null, teamId: null, withTrigger: true }
)

const open = defineModel<boolean>('open', { default: false })
const updateTeamInput = ref({ name: '', description: '' })
const teamStore = useTeamStore()
const toast = useToast()

const updateTeamSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters')
})

const {
  isPending: teamIsUpdating,
  error: updateTeamError,
  mutate: updateTeamMutate,
  reset
} = useUpdateTeamMutation()

const archivedTeamErrorMessage = useArchivedTeamMutationError(() => updateTeamError.value)

function getRequiredTeamId(): string | null {
  const teamId = props.teamId ?? teamStore.currentTeamId
  if (!teamId) {
    toast.add({ title: 'Company ID is required', color: 'error' })
    return null
  }
  return String(teamId)
}

function executeUpdateTeam() {
  const teamId = getRequiredTeamId()
  if (!teamId) return
  updateTeamMutate(
    { pathParams: { id: teamId }, body: { ...updateTeamInput.value } },
    {
      onSuccess: () => {
        toast.add({ title: 'Company updated successfully', color: 'success' })
        open.value = false
        reset()
      }
    }
  )
}

function prefillUpdateForm() {
  const meta = props.currentTeam ?? teamStore.currentTeamMeta.data
  updateTeamInput.value.name = meta?.name || ''
  updateTeamInput.value.description = meta?.description || ''
}

// Prefill off the open state rather than the trigger's click: the teams list
// opens this modal programmatically, so there is no click to hang it on.
watch(open, (isOpen) => {
  if (isOpen) prefillUpdateForm()
})
</script>
