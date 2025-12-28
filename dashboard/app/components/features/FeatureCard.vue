<template>
  <UPageCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-highlighted">
            Submit Restriction Settings
          </h3>
          <p class="text-sm text-muted">
            Configure claim submission time restrictions for team members
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="About Submit Restriction"
        description="When enabled globally (ON), team members can only submit claims for the current week. Teams with overrides can have their own settings: ON = restricted to current week, OFF = can submit anytime."
      />

      <!-- Global Restriction Toggle -->
      <UCard class="mb-6">
        <template #header>
          <h4 class="font-semibold text-highlighted">
            Global Setting
          </h4>
        </template>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">
              Enable Restriction Globally
            </p>
            <p class="text-sm text-muted">
              When enabled, all team members can only submit claims for current
              week
            </p>
          </div>
          <div class="flex items-center gap-3">
            <USelect
              v-model="globalStatus"
              :items="FEATURE_STATUS_OPTIONS"
              value-key="value"
              :disabled="isLoadingGlobal"
              data-test="global-restriction-select"
              class="w-32"
              @update:model-value="saveGlobalSettings"
            />
          </div>
        </div>
      </UCard>

      <!-- Add Override Button -->
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-semibold text-highlighted">
            Team Overrides
          </h4>
          <p class="text-sm text-muted">
            Teams with custom restriction settings ({{ teamFunctionOverrides.length }}
            overrides)
          </p>
        </div>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          data-test="add-override-btn"
          @click="openAddOverrideModal"
        >
          Add Override
        </UButton>
      </div>

      <!-- Team Overrides Table -->
      <TeamOverridesTable
        :teams="teamFunctionOverrides"
        :loading="isLoading"
        :loading-team-id="loadingTeamId"
        :global-restriction-enabled="true"
        :is-editable="isEditable"
        :total="teamFunctionOverrides.length"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        @toggle-restriction="handleToggleRestriction"
        @remove-override="handleRemoveOverride"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      />

      <!-- Add Override Modal -->
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
              <div>
                <label class="block text-sm font-medium mb-2">Select Team</label>
                <USelect
                  v-model="selectedTeamId"
                  :items="availableTeamsOptions"
                  value-key="value"
                  placeholder="Choose a team..."
                  :loading="isLoadingTeams"
                  :disabled="
                    isLoadingTeams || availableTeamsOptions.length === 0
                  "
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

              <div>
                <label class="block text-sm font-medium mb-2">Restriction Setting</label>
                <USelect
                  v-model="newOverrideStatus"
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
                  @click="createNewOverride"
                >
                  Create Override
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Team } from '~/types'
import TeamOverridesTable from './TeamOverridesTable.vue'
import { useToast } from '#ui/composables/useToast'
import {
  fetchSubmitRestrictionFeature,
  updateGlobalRestriction,
  createTeamOverride,
  updateTeamOverride,
  removeTeamOverride,
  transformToTeamOverrides,
  FEATURE_STATUS_OPTIONS,
  type SubmitRestrictionFeature,
  type TeamRestrictionOverride,
  type FeatureStatus
} from '~/lib/axios'

// Props
interface Props {
  isEditable?: boolean
}

withDefaults(defineProps<Props>(), {
  isEditable: true
})

// Toast notifications
const toast = useToast()

// Composables
const { fetchTeams } = useTeams()

// State
const isLoadingGlobal = ref(false)
const isLoading = ref(false)
const loadingTeamId = ref<number | null>(null)
const currentFeature = ref<SubmitRestrictionFeature | null>(null)
const globalStatus = ref<FeatureStatus>('enabled')

// Pagination
const pagination = ref({
  page: 1,
  pageSize: 10
})

// Add Override Modal State
const isAddOverrideModalOpen = ref(false)
const allTeams = ref<Team[]>([])
const selectedTeamId = ref<number | undefined>(undefined)
const newOverrideStatus = ref<FeatureStatus>('enabled')
const isCreatingOverride = ref(false)
const isLoadingTeams = ref(false)

// Computed
const teamFunctionOverrides = computed<TeamRestrictionOverride[]>(() => {
  return transformToTeamOverrides(currentFeature.value)
})

const availableTeamsOptions = computed(() => {
  // Filter out teams that already have overrides
  const overriddenTeamIds = new Set(teamFunctionOverrides.value.map(o => o.teamId))
  return allTeams.value
    .filter(team => !overriddenTeamIds.has(team.id))
    .map(team => ({
      label: `${team.name} (${team._count?.members || 0} members)`,
      value: team.id
    }))
})

// Handlers
const saveGlobalSettings = async (value: FeatureStatus | undefined) => {
  if (!value) return
  isLoadingGlobal.value = true
  const previousStatus = globalStatus.value
  try {
    const success = await updateGlobalRestriction(value)
    if (success) {
      globalStatus.value = value
      // Refresh the feature data
      await loadFeatureData()
      toast.add({
        title: 'Success',
        description: `Global restriction setting updated to ${value}`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    } else {
      // Revert on failure
      globalStatus.value = previousStatus
    }
  } catch (error) {
    console.error('Error updating global restriction:', error)
    globalStatus.value = previousStatus
    toast.add({
      title: 'Error',
      description: 'Failed to update global restriction setting',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isLoadingGlobal.value = false
  }
}

const handleToggleRestriction = async (
  team: TeamRestrictionOverride,
  value: FeatureStatus
) => {
  loadingTeamId.value = team.teamId
  try {
    const success = await updateTeamOverride(team.teamId, value)
    if (success) {
      await loadFeatureData()
      toast.add({
        title: 'Success',
        description: `Team override updated to ${value}`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }
  } catch (error) {
    console.error('Error toggling team restriction:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to update team override',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loadingTeamId.value = null
  }
}

const handleRemoveOverride = async (team: TeamRestrictionOverride) => {
  loadingTeamId.value = team.teamId
  try {
    const success = await removeTeamOverride(team.teamId)
    if (success) {
      await loadFeatureData()
      toast.add({
        title: 'Success',
        description: 'Team override removed',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }
  } catch (error) {
    console.error('Error removing team override:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to remove team override',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loadingTeamId.value = null
  }
}

const handlePageChange = (page: number) => {
  pagination.value.page = page
}

const handlePageSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
}

// Add Override Modal Functions
const openAddOverrideModal = async () => {
  selectedTeamId.value = undefined
  newOverrideStatus.value = 'enabled'
  isAddOverrideModalOpen.value = true

  // Load teams if not already loaded
  if (allTeams.value.length === 0) {
    isLoadingTeams.value = true
    try {
      allTeams.value = await fetchTeams()
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      isLoadingTeams.value = false
    }
  }
}

const createNewOverride = async () => {
  if (!selectedTeamId.value) return

  isCreatingOverride.value = true
  try {
    const success = await createTeamOverride(
      selectedTeamId.value,
      newOverrideStatus.value
    )
    if (success) {
      toast.add({
        title: 'Success',
        description: 'Team override created successfully',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      isAddOverrideModalOpen.value = false
      await loadFeatureData()
    }
  } catch (error) {
    console.error('Error creating override:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to create team override',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isCreatingOverride.value = false
  }
}

// Load feature data
const loadFeatureData = async () => {
  isLoading.value = true
  try {
    const feature = await fetchSubmitRestrictionFeature()
    if (feature) {
      currentFeature.value = feature
      globalStatus.value = feature.status || 'enabled'
    }
  } catch (error) {
    console.error('Error loading feature data:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load feature settings',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isLoading.value = false
  }
}

// Expose methods for external use
defineExpose({
  refreshTeams: loadFeatureData
})

// Initialize on mount
onMounted(async () => {
  isLoadingGlobal.value = true
  isLoading.value = true
  try {
    await loadFeatureData()
    // Pre-load teams for the modal
    allTeams.value = await fetchTeams()
  } catch (error) {
    console.error('Error initializing component:', error)
  } finally {
    isLoadingGlobal.value = false
  }
})
</script>
