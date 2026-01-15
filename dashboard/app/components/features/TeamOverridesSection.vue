<template>
  <div class="space-y-6">
    <!-- Add Override Button Header -->
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-semibold text-highlighted">
          Team Overrides
        </h4>
        <p class="text-sm text-muted">
          Teams with custom restriction settings ({{ teams.length }} overrides)
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
      :teams="teams"
      :loading="loading"
      :loading-team-id="loadingTeamId"
      :global-restriction-enabled="true"
      :is-editable="isEditable"
      :total="teams.length"
      :current-page="pagination.page"
      :page-size="pagination.pageSize"
      @toggle-restriction="handleToggleRestriction"
      @remove-override="handleRemoveOverride"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    />

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Team, FeatureStatus } from '~/types'
import TeamOverridesTable from './TeamOverridesTable.vue'
import { useToast } from '#ui/composables/useToast'
import {
  useCreateFeatureTeamOverride
} from '~/queries'
import {
  FEATURE_STATUS_OPTIONS,
  type TeamRestrictionOverride
} from '~/api/features'
import { useTeams } from '~/composables/useTeams'

// Props
interface Props {
  featureName: string
  teams: TeamRestrictionOverride[]
  loading: boolean
  loadingTeamId: number | null
  isEditable?: boolean
  allTeams: Team[]
}

const props = withDefaults(defineProps<Props>(), {
  isEditable: true
})

// Emits
const emit = defineEmits<{
  'toggle-restriction': [team: TeamRestrictionOverride, status: FeatureStatus]
  'remove-override': [team: TeamRestrictionOverride]
  'page-change': [page: number]
  'page-size-change': [size: number]
  'data-updated': []
}>()

// Toast
const toast = useToast()

// Composables
const { fetchTeams } = useTeams()

// Query hooks
const { mutateAsync: createTeamOverride } = useCreateFeatureTeamOverride()

// Modal State
const isAddOverrideModalOpen = ref(false)
const selectedTeamId = ref<number | undefined>(undefined)
const selectedOverrideStatus = ref<FeatureStatus>('enabled')
const isCreatingOverride = ref(false)
const isLoadingTeams = ref(false)

// Pagination
const pagination = ref({
  page: 1,
  pageSize: 10
})

// Computed
const availableTeamsOptions = computed(() => {
  const overriddenTeamIds = new Set(props.teams.map(o => o.teamId))
  return props.allTeams
    .filter(team => !overriddenTeamIds.has(team.id))
    .map(team => ({
      label: `${team.name} (${team._count?.members || 0} members)`,
      value: team.id
    }))
})

// Handlers
const handleToggleRestriction = async (
  team: TeamRestrictionOverride,
  status: FeatureStatus
) => {
  emit('toggle-restriction', team, status)
}

const handleRemoveOverride = async (team: TeamRestrictionOverride) => {
  emit('remove-override', team)
}

const handlePageChange = (page: number) => {
  pagination.value.page = page
  emit('page-change', page)
}

const handlePageSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  emit('page-size-change', size)
}

// Modal Functions
const openAddOverrideModal = async () => {
  // Reset form
  selectedTeamId.value = undefined
  selectedOverrideStatus.value = 'enabled'
  isAddOverrideModalOpen.value = true

  // Load teams if not already loaded
  if (props.allTeams.length === 0) {
    isLoadingTeams.value = true
    try {
      await fetchTeams()
      // Emit to parent to update allTeams
      emit('data-updated')
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to load teams',
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    } finally {
      isLoadingTeams.value = false
    }
  }
}

const handleCreateNewOverride = async () => {
  if (!selectedTeamId.value) {
    toast.add({
      title: 'Error',
      description: 'Please select a team',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
    return
  }

  isCreatingOverride.value = true
  try {
    await createTeamOverride({
      featureName: props.featureName,
      teamId: selectedTeamId.value,
      status: selectedOverrideStatus.value
    })

    isAddOverrideModalOpen.value = false
    await fetchTeams()
    emit('data-updated')

    toast.add({
      title: 'Success',
      description: 'Team override created successfully',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (error) {
    console.error(`Error creating team override:`, error)
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
</script>
