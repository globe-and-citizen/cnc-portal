<template>
  <UButton
    icon="i-lucide-plus"
    color="primary"
    data-test="add-override-btn"
    @click="openAddOverrideModal"
  >
    Add Override
  </UButton>

  <UModal v-model:open="isAddOverrideModalOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-default">
                Add Team Override
              </h3>
              <p class="text-sm text-muted mt-0.5">
                Configure a custom setting for a specific team
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Close modal"
              @click="handleClose"
            />
          </div>
        </template>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-6"
          data-test="add-override-form"
          @submit="handleSubmit"
        >
          <UFormField
            label="Team"
            name="team"
            description="Select which team should have a custom setting"
            required
          >
            <USelectMenu
              v-model="state.team"
              :items="availableTeamsOptions"
              searchable
              :loading="isLoadingTeams"
              :disabled="isLoadingTeams || availableTeamsOptions.length === 0"
              data-test="team-select"
              icon="i-lucide-users"
              placeholder="Choose a team..."
              class="w-full"
            >
              <template #empty>
                <div class="flex flex-col items-center justify-center py-6 text-center">
                  <UIcon name="i-lucide-shield-check" class="w-8 h-8 text-muted mb-2" />
                  <p class="text-sm font-medium text-default">
                    All teams configured
                  </p>
                  <p class="text-xs text-muted mt-1">
                    Every team already has an override for this feature
                  </p>
                </div>
              </template>
            </USelectMenu>
          </UFormField>

          <UFormField
            label="Override Status"
            name="status"
            description="Set the feature status for this team"
            required
          >
            <USelectMenu
              v-model="state.status"
              :items="statusOptions"
              :disabled="isCreatingOverride"
              data-test="override-status-select"
              icon="i-lucide-settings"
              class="w-full"
            />
          </UFormField>

          <div class="flex items-center gap-3 pt-4 justify-end ">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="isCreatingOverride"
              @click="handleClose"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="primary"
              :loading="isCreatingOverride"
              :disabled="isCreatingOverride"
              data-test="create-override-btn"
              icon="i-lucide-check"
            >
              Create Override
            </UButton>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { FEATURE_STATUS_OPTIONS } from '~/api/features'
import { useCreateFeatureTeamOverrideQuery } from '~/queries/feature.query'
import { useTeamsQuery } from '~/queries/team.query'
import type { Feature, FeatureStatus } from '~/types/feature'

// Props
const props = defineProps<{
  feature: Feature
}>()

// Queries
const { data: teams, isLoading: isLoadingTeams } = useTeamsQuery()
const { mutateAsync: createTeamOverride, isPending: isCreatingOverride } = useCreateFeatureTeamOverrideQuery()

// Zod Schema
const schema = z.object({
  team: z.object({
    label: z.string(),
    value: z.number()
  }).refine(option => option.value > 0, {
    message: 'Team selection is required'
  }),
  status: z.object({
    label: z.string(),
    value: z.enum(['enabled', 'disabled', 'beta'] as const)
  })
})

type Schema = z.output<typeof schema>

// Local state
const isAddOverrideModalOpen = ref(false)

const state = reactive<Partial<Schema>>({
  team: undefined,
  status: { label: 'Enabled', value: 'enabled' }
})

// Status options
const statusOptions = FEATURE_STATUS_OPTIONS.map(option => ({
  label: option.label,
  value: option.value
}))

// Computed
const availableTeamsOptions = computed(() => {
  return teams.value?.filter((team) => {
    return !props.feature.teamFunctionOverrides.some(
      override => override.teamId === team.id
    )
  }).map((team) => {
    return {
      label: team.name,
      value: team.id
    }
  }) || []
})

// Methods
const resetForm = () => {
  state.team = undefined
  state.status = { label: 'Enabled', value: 'enabled' }
}

const openAddOverrideModal = () => {
  resetForm()
  isAddOverrideModalOpen.value = true
}

const handleSubmit = async (event: FormSubmitEvent<Schema>) => {
  await createTeamOverride({
    featureName: props.feature.functionName,
    teamId: event.data.team.value,
    status: event.data.status.value as FeatureStatus
  })
  handleClose()
}

const handleClose = () => {
  resetForm()
  isAddOverrideModalOpen.value = false
}

// Watch for modal close to reset form
watch(isAddOverrideModalOpen, (newValue) => {
  if (newValue) {
    resetForm()
  }
})
</script>
