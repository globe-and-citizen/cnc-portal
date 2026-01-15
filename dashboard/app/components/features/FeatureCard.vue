<template>
  <div />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Team, FeatureStatus } from '~/types'
import FeatureGlobalRestriction from './FeatureGlobalRestriction.vue'
import TeamOverridesSection from './TeamOverridesSection.vue'
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
  } finally {
    loadingTeamId.value = null
  }
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
