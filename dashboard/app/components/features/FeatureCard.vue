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
        @updated="refetchFeatureData"
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
        @remove-override="handleRemoveOverride"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        @data-updated="refetchFeatureData"
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
  useUpdateFeatureTeamOverride,
  useRemoveFeatureTeamOverride
} from '~/queries'
import {
  transformToTeamOverrides,
  type FeatureWithOverrides,
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
const { mutateAsync: removeTeamOverride } = useRemoveFeatureTeamOverride()
const { data: featureData, refetch: refetchFeatureData } = useFeatureRestrictions(() => props.featureName)

// State
const isLoading = ref(false)
const loadingTeamId = ref<number | null>(null)
const currentFeature = ref<FeatureWithOverrides | null>(null)
const globalStatus = ref<FeatureStatus>('enabled')
const allTeams = ref<Team[]>([])

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
  return transformToTeamOverrides(currentFeature.value)
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
    await refetchFeatureData()
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

const handleRemoveOverride = async (team: TeamRestrictionOverride) => {
  loadingTeamId.value = team.teamId
  try {
    await removeTeamOverride({
      featureName: props.featureName,
      teamId: team.teamId
    })
    await refetchFeatureData()
    toast.add({
      title: 'Success',
      description: 'Team override removed successfully',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (error) {
    console.error(`Error removing ${props.featureName} team override:`, error)
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

const handlePageChange = (_page: number) => {
  // Pagination is handled by TeamOverridesSection
}

const handlePageSizeChange = (_size: number) => {
  // Pagination is handled by TeamOverridesSection
}

// Load feature data
const loadFeatureData = async () => {
  isLoading.value = true
  try {
    await refetchFeatureData()
    if (featureData.value?.data) {
      currentFeature.value = featureData.value.data
      globalStatus.value = featureData.value.data.status || 'enabled'
    }
  } catch (error) {
    console.error(`Error loading ${props.featureName} feature data:`, error)
    toast.add({
      title: 'Error',
      description: `Failed to load ${featureDisplayName.value} settings`,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isLoading.value = false
  }
}

// Watch for feature name changes
watch(() => props.featureName, async (newFeatureName) => {
  if (newFeatureName) {
    await loadFeatureData()
  }
}, { immediate: false })

// Expose methods
defineExpose({
  refreshData: loadFeatureData
})

// Initialize
onMounted(async () => {
  try {
    await loadFeatureData()
    allTeams.value = await fetchTeams()
  } catch (error) {
    console.error('Error initializing feature card:', error)
  }
})
</script>
