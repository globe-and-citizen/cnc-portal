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
              When enabled, all team members can only submit claims for current week
            </p>
          </div>
          <USwitch v-model="globalRestrictionEnabled" :disabled="isLoadingGlobal" @update:model-value="saveGlobalSettings" />
        </div>
      </UCard>

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
      <UPageCard variant="subtle">
        <template #header>
          <h4 class="font-semibold text-highlighted">
            Overridden Teams
          </h4>
        </template>
        <div v-if="!isLoading && teamOverrides.length === 0" class="text-center py-8">
          <UIcon name="i-lucide-users" class="w-12 h-12 text-muted mx-auto mb-3" />
          <p class="text-muted">
            No team overrides configured
          </p>
        </div>
        <div v-else class="text-sm text-muted">
          <p>Teams with custom restriction settings: {{ totalOverrides }}</p>
        </div>
      </UPageCard>

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
                  :disabled="isLoadingTeams || availableTeamsOptions.length === 0"
                  data-test="team-select"
                  class="w-full"
                  icon="i-lucide-users"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Global State
const globalRestrictionEnabled = ref(true)
const isLoadingGlobal = ref(false)

// Team Overrides State
const teamOverrides = ref<TeamOverride[]>([])
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

// Interface for TeamOverride
interface TeamOverride {
  teamId: number
  teamName: string
  isRestricted: boolean
  memberCount?: number
  updatedAt?: string
}

// Add Override Modal State
const isAddOverrideModalOpen = ref(false)
const availableTeams = ref<Team[]>([])
const selectedTeamId = ref<number | undefined>(undefined)
const newOverrideRestricted = ref(false)
const isCreatingOverride = ref(false)
const isLoadingTeams = ref(false)

// Interface for Team
interface Team {
  id: number
  name: string
  memberCount?: number
}

// Computed
const availableTeamsOptions = computed(() => {
  return availableTeams.value.map(team => ({
    label: `${team.name} (${team.memberCount || 0} members)`,
    value: team.id
  }))
})

// Handlers
const _handlePageSizeChange = async (newSize: number) => {
  pagination.value.pageSize = newSize
  currentPage.value = 1
  pagination.value.page = 1
  // TODO: Implement pagination
}

const _handlePageChange = async (page: number) => {
  currentPage.value = page
  pagination.value.page = page
  // TODO: Implement pagination
}

const saveGlobalSettings = async (value: boolean) => {
  isLoadingGlobal.value = true
  setTimeout(() => {
    globalRestrictionEnabled.value = value
    isLoadingGlobal.value = false
  }, 500)
}

const _handleToggleRestriction = async (team: TeamOverride, _value: boolean) => {
  loadingTeamId.value = team.teamId
  // TODO: Implement
  setTimeout(() => {
    loadingTeamId.value = null
  }, 500)
}

const _handleRemoveOverride = async (team: TeamOverride) => {
  loadingTeamId.value = team.teamId
  // TODO: Implement
  setTimeout(() => {
    loadingTeamId.value = null
  }, 500)
}

const _loadTeamOverrides = async () => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

// Add Override Modal Functions
const openAddOverrideModal = async () => {
  selectedTeamId.value = undefined
  newOverrideRestricted.value = false
  isAddOverrideModalOpen.value = true
  isLoadingTeams.value = true
  setTimeout(() => {
    isLoadingTeams.value = false
  }, 500)
}

const createOverride = async () => {
  if (!selectedTeamId.value) return
  isCreatingOverride.value = true
  setTimeout(() => {
    isCreatingOverride.value = false
    isAddOverrideModalOpen.value = false
  }, 500)
}

// Expose methods for external use
defineExpose({
  refreshTeams: _loadTeamOverrides
})

// Initialize on mount
onMounted(async () => {
  isLoadingGlobal.value = true
  setTimeout(() => {
    isLoadingGlobal.value = false
  }, 500)
})

onUnmounted(() => {
  // Cleanup
})
</script>
