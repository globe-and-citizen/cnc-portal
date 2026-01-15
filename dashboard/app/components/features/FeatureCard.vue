<template>
  <UPageCard>
    <div class="space-y-6">
      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        :title="`About ${featureDisplayName}`"
        :description="alertDescription"
      />

      <!-- Global Restriction Toggle -->
      <FeatureGlobalRestriction
        v-model="globalStatus"
        :feature-name="featureName"
        :is-editable="isEditable"
      />

      <!-- Team Overrides Section (Button + Modal + Table) -->
      <TeamOverridesSection
        :feature-name="featureName"
        :teams="teamFunctionOverrides"
        :loading="isLoading"
        :loading-team-id="loadingTeamId"
        :is-editable="isEditable"
        :all-teams="allTeams"
        @toggle-restriction="handleToggleRestriction"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        @data-updated="handleDataUpdated"
      />
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Team, FeatureStatus } from '~/types'
import FeatureGlobalRestriction from './FeatureGlobalRestriction.vue'
import TeamOverridesSection from './TeamOverridesSection.vue'
import { useToast } from '#ui/composables/useToast'
import {
  useFeatureRestrictions,
  useUpdateFeatureTeamOverride
} from '~/queries'
import {
  transformToTeamOverrides,
  type TeamRestrictionOverride
} from '~/api/features'
import { useTeams } from '~/composables/useTeams'

// Props
interface Props {
  featureName?: string
  isEditable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  featureName: 'SUBMIT_RESTRICTION',
  isEditable: true
})

// Toast notifications
const toast = useToast()

// Composables
const { fetchTeams } = useTeams()

// Query hooks
const { mutateAsync: updateTeamOverride } = useUpdateFeatureTeamOverride()
const {
  data: featureData,
  isLoading,
  refetch: refetchFeatureData
} = useFeatureRestrictions(() => props.featureName)

// State
const loadingTeamId = ref<number | null>(null)
const globalStatus = ref<FeatureStatus>('enabled')
const allTeams = ref<Team[]>([])

// Watch for featureData changes and sync globalStatus
watch(featureData, (newData) => {
  if (newData?.status) {
    globalStatus.value = newData.status
  }
}, { immediate: true })

// Computed Properties
const featureDisplayName = computed(() => {
  if (!props.featureName) return 'Feature'
  return props.featureName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
})

const alertDescription = computed(() => {
  return `This feature has three states: Enabled (full restriction), Disabled (no restriction), and Beta (testing phase). Teams with overrides can have their own state independent of the global setting.`
})

const teamFunctionOverrides = computed<TeamRestrictionOverride[]>(() => {
  return transformToTeamOverrides(featureData.value || null)
})

// Handlers
const handleToggleRestriction = async (
  team: TeamRestrictionOverride,
  value: FeatureStatus
) => {
  loadingTeamId.value = team.teamId
  try {
    await updateTeamOverride({
      featureName: props.featureName,
      teamId: team.teamId,
      status: value
    })
    // Query invalidation is handled by the mutation hook
  } catch (error) {
    console.error(`Error toggling ${props.featureName} team restriction:`, error)
    toast.add({
      title: 'Error',
      description: 'Failed to update team restriction',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loadingTeamId.value = null
  }
}

const handlePageChange = (_page: number) => {
  // Pagination is handled by TeamOverridesTable
}

const handlePageSizeChange = (_size: number) => {
  // Pagination is handled by TeamOverridesTable
}

// Handler for when data is updated (from add/remove operations)
const handleDataUpdated = () => {
  refetchFeatureData()
}

// Expose methods
defineExpose({
  refreshData: refetchFeatureData
})

// Initialize
onMounted(async () => {
  try {
    allTeams.value = await fetchTeams()
  } catch (error) {
    console.error('Error initializing feature card:', error)
  }
})
</script>
