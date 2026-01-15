<template>
  <UButton
    icon="i-lucide-plus"
    color="primary"
    data-test="add-override-btn"
    @click="openAddOverrideModal"
  >
    Add Override
  </UButton>
  <!-- Add Team Override Modal -->
  <UModal v-model:open="isAddOverrideModalOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              Add Team Override
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="isAddOverrideModalOpen = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Team Select -->
          <div>
            <label class="block text-sm font-medium mb-2">Select Team</label>
            <USelect
              v-model="selectedTeamId"
              :items="availableTeamsOptions"
              value-key="value"
              placeholder="Choose a team..."
              :loading="isLoadingTeams"
              :disabled="isLoadingTeams || availableTeamsOptions.length === 0"
              data-test="team-select"
              class="w-full"
              icon="i-lucide-users"
            />
            <p
              v-if="availableTeamsOptions.length === 0 && !isLoadingTeams"
              class="text-sm text-muted mt-2"
            >
              All teams already have overrides configured.
            </p>
          </div>

          <!-- Restriction Setting Select -->
          <div class="w-32">
            <label class="block text-sm font-medium mb-2">Restriction Setting</label>
            <USelect
              v-model="selectedOverrideStatus"
              :items="FEATURE_STATUS_OPTIONS"
              value-key="value"
              data-test="new-override-select"
              class="w-full"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isAddOverrideModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="isCreatingOverride"
              :disabled="!selectedTeamId"
              data-test="create-override-btn"
              @click="handleCreateNewOverride"
            >
              Create Override
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { FEATURE_STATUS_OPTIONS } from '~/api/features'
import { useCreateFeatureTeamOverrideQuery } from '~/queries/feature.query'
import { useTeamsQuery } from '~/queries/team.query'
import type { Feature, FeatureStatus } from '~/types/feature'

const selectedOverrideStatus = ref<FeatureStatus>('enabled')
const isAddOverrideModalOpen = ref(false)
const selectedTeamId = ref<number | undefined>(undefined)

const props = defineProps<{
  feature: Feature
}>()

const { data: teams, isLoading: isLoadingTeams } = useTeamsQuery()
const { mutateAsync: createTeamOverride, isPending: isCreatingOverride } = useCreateFeatureTeamOverrideQuery()

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

// Modal Functions
const openAddOverrideModal = async () => {
  // Reset form
  selectedTeamId.value = undefined
  selectedOverrideStatus.value = 'enabled'
  isAddOverrideModalOpen.value = true
}

const handleCreateNewOverride = async () => {
  if (!selectedTeamId.value) {
    return
  }

  await createTeamOverride({
    featureName: props.feature.functionName,
    teamId: selectedTeamId.value,
    status: selectedOverrideStatus.value
  })

  isAddOverrideModalOpen.value = false
}
</script>

<style scoped>

</style>
