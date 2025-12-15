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
      <GlobalRestrictionSection
        v-model:enabled="globalRestrictionEnabled"
        :loading="isLoadingGlobal"
        @save="saveGlobalSettings"
      />

      <!-- Add Override Button -->
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-semibold text-highlighted">
            Team Overrides
          </h4>
          <p class="text-sm text-muted">
            Teams with custom restriction settings ({{ totalOverrides }} overrides)
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
        :teams="teamOverrides"
        :loading="isLoading"
        :loading-team-id="loadingTeamId"
        :global-restriction-enabled="globalRestrictionEnabled"
        :total="totalOverrides"
        :current-page="currentPage"
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
                  placeholder="Choose a team..."
                  data-test="team-select"
                  class="w-full"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">Restriction Setting</label>
                <div class="flex items-center gap-3">
                  <USwitch
                    v-model="newOverrideRestricted"
                    data-test="new-override-switch"
                  />
                  <span class="text-sm">
                    {{ newOverrideRestricted ? 'Restricted (current week only)' : 'Unrestricted (submit anytime)' }}
                  </span>
                </div>
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
                  @click="createOverride"
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { TeamRestrictionOverride, TeamOption } from '~/types/restrictions'
import GlobalRestrictionSection from './GlobalRestrictionSection.vue'
import TeamOverridesTable from './TeamOverridesTable.vue'

// Composables
const {
  fetchGlobalSetting,
  updateGlobalSetting,
  fetchAllTeams,
  fetchTeamOverrides,
  createTeamOverride,
  updateTeamOverride,
  deleteTeamOverride
} = useTeamRestrictions()
const toast = useToast()

// Global State
const globalRestrictionEnabled = ref(true)
const isLoadingGlobal = ref(false)

// Team Overrides State
const teamOverrides = ref<TeamRestrictionOverride[]>([])
const isLoading = ref(false)
const loadingTeamId = ref<number | null>(null)
const totalOverrides = ref(0)
const currentPage = ref(1)

// Pagination
const pagination = ref({
  page: 1,
  pageSize: 10,
  pageIndex: 0
})

// Add Override Modal State
const isAddOverrideModalOpen = ref(false)
const availableTeams = ref<TeamOption[]>([])
const selectedTeamId = ref<number | undefined>(undefined)
const newOverrideRestricted = ref(false)
const isCreatingOverride = ref(false)

// Computed
const availableTeamsOptions = computed(() => {
  return availableTeams.value.map(team => ({
    label: `${team.name} (${team.memberCount} members)`,
    value: team.id
  }))
})

// Handlers
const handlePageSizeChange = async (newSize: number) => {
  pagination.value.pageSize = newSize
  currentPage.value = 1
  pagination.value.page = 1
  await loadTeamOverrides()
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  pagination.value.page = page
  await loadTeamOverrides()
}

const saveGlobalSettings = async (value: boolean) => {
  isLoadingGlobal.value = true
  try {
    const result = await updateGlobalSetting(value)
    if (result) {
      globalRestrictionEnabled.value = value
      toast.add({
        title: 'Global Setting Updated',
        description: `Restriction is now ${value ? 'enabled' : 'disabled'} globally`,
        color: 'success'
      })
    }
  } catch (error) {
    console.error('Error updating global setting:', error)
    toast.add({
      title: 'Update Failed',
      description: 'Failed to update global restriction setting',
      color: 'error'
    })
  } finally {
    isLoadingGlobal.value = false
  }
}

const handleToggleRestriction = async (team: TeamRestrictionOverride, value: boolean) => {
  loadingTeamId.value = team.teamId
  try {
    const result = await updateTeamOverride(team.teamId, value)
    if (result) {
      const index = teamOverrides.value.findIndex(t => t.teamId === team.teamId)
      if (index !== -1) {
        teamOverrides.value[index] = result
      }
      toast.add({
        title: 'Override Updated',
        description: `${team.teamName} is now ${value ? 'restricted' : 'unrestricted'}`,
        color: 'success'
      })
    }
  } catch (error) {
    console.error('Error updating team override:', error)
    toast.add({
      title: 'Update Failed',
      description: 'Failed to update team override',
      color: 'error'
    })
  } finally {
    loadingTeamId.value = null
  }
}

const handleRemoveOverride = async (team: TeamRestrictionOverride) => {
  loadingTeamId.value = team.teamId
  try {
    const success = await deleteTeamOverride(team.teamId)
    if (success) {
      toast.add({
        title: 'Override Removed',
        description: `${team.teamName} now inherits global setting`,
        color: 'success'
      })
      await loadTeamOverrides()
    }
  } catch (error) {
    console.error('Error removing override:', error)
    toast.add({
      title: 'Remove Failed',
      description: 'Failed to remove team override',
      color: 'error'
    })
  } finally {
    loadingTeamId.value = null
  }
}

const loadTeamOverrides = async () => {
  isLoading.value = true
  try {
    const result = await fetchTeamOverrides(currentPage.value, pagination.value.pageSize)
    if (result) {
      teamOverrides.value = result.data
      totalOverrides.value = result.pagination.total
    }
  } catch (error) {
    console.error('Error loading team overrides:', error)
    toast.add({
      title: 'Load Failed',
      description: 'Failed to load team overrides',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// Add Override Modal Functions
const openAddOverrideModal = async () => {
  selectedTeamId.value = undefined
  newOverrideRestricted.value = false
  availableTeams.value = await fetchAllTeams()
  isAddOverrideModalOpen.value = true
}

const createOverride = async () => {
  if (!selectedTeamId.value) return

  isCreatingOverride.value = true
  try {
    const result = await createTeamOverride(selectedTeamId.value, newOverrideRestricted.value)
    if (result) {
      toast.add({
        title: 'Override Created',
        description: `Override added for ${result.teamName}`,
        color: 'success'
      })
      isAddOverrideModalOpen.value = false
      await loadTeamOverrides()
    }
  } catch (error) {
    console.error('Error creating override:', error)
    toast.add({
      title: 'Creation Failed',
      description: 'Failed to create team override',
      color: 'error'
    })
  } finally {
    isCreatingOverride.value = false
  }
}

// Expose methods for external use
defineExpose({
  refreshTeams: loadTeamOverrides
})

// Auto-refresh polling
let pollingInterval: ReturnType<typeof setInterval> | null = null

const startPolling = () => {
  pollingInterval = setInterval(async () => {
    try {
      const result = await fetchTeamOverrides(currentPage.value, pagination.value.pageSize)
      if (result) {
        teamOverrides.value = result.data
        totalOverrides.value = result.pagination.total
      }
    } catch (error) {
      console.debug('Polling failed:', error)
    }
  }, 30000)
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

// Initialize on mount
onMounted(async () => {
  isLoadingGlobal.value = true
  try {
    const globalSetting = await fetchGlobalSetting()
    if (globalSetting) {
      globalRestrictionEnabled.value = globalSetting.isGloballyRestricted
    }
  } catch (error) {
    console.error('Error fetching global setting:', error)
  } finally {
    isLoadingGlobal.value = false
  }

  await loadTeamOverrides()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>
