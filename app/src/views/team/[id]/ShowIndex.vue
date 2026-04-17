<template>
  <!-- Navigation and breadcrumb -->
  <div class="flex w-full flex-col gap-6">
    <div>
      <UBreadcrumb v-if="!teamStore.currentTeamMeta.error" :items="breadcrumbItems">
        <template #loader>
          <USkeleton class="h-4 w-20" data-test="loader" />
        </template>
      </UBreadcrumb>
    </div>
    <div v-if="teamStore.currentTeamMeta?.error" data-test="error-state">
      <UAlert
        v-if="teamStore.currentTeamMeta.error?.status == 404"
        color="warning"
        title="Company not found"
        description="This company doesn't exist or may have been removed."
      />
      <UAlert
        v-else
        color="error"
        title="Something went wrong"
        description="We couldn't load this company. Please try again later."
      />
    </div>
    <div
      v-if="route.name == 'show-team' && teamStore.currentTeamMeta?.data"
      class="flex flex-col gap-6"
    >
      <!-- Continue Team Creation section -->
      <div v-if="!hasContract">
        <ContinueAddTeamForm :team="teamStore.currentTeamMeta.data" />
      </div>
      <TeamMeta />
      <CompanyOverview />
    </div>
    <RouterView v-if="teamStore.currentTeam" />
  </div>
</template>
<script setup lang="ts">
import { useTeamStore } from '@/stores/teamStore'
import { computed, onUnmounted, watch } from 'vue'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSyncWeeklyClaimsMutation } from '@/queries/weeklyClaim.queries'
import TeamMeta from '@/components/sections/DashboardView/TeamMetaSection.vue'
import CompanyOverview from '@/components/sections/DashboardView/CompanyOverview.vue'
import ContinueAddTeamForm from '@/components/sections/TeamView/forms/ContinueAddTeamForm.vue'
import { useSyncContractsMutation } from '@/queries'

const teamStore = useTeamStore()

const route = useRoute()
const { mutate: syncWeeklyClaims } = useSyncWeeklyClaimsMutation()
const { mutateAsync: syncContracts } = useSyncContractsMutation()

onMounted(() => {
  if (route.params.id) {
    teamStore.setCurrentTeamId(route.params.id as string)
  } else {
    // e.g. this.$router.push('/teams')
  }
})

watch(teamStore.currentTeamMeta, () => {
  if (
    teamStore.currentTeamId &&
    teamStore.currentTeamMeta.data?.currentOfficer?.address &&
    teamStore.currentTeamMeta.data?.teamContracts.length === 0
  ) {
    syncContracts({ body: { teamId: teamStore.currentTeamId } })
  }
})

const hasContract = computed(() => {
  return (teamStore.currentTeamMeta.data?.teamContracts ?? []).length > 0
})

const breadcrumbItems = computed(() => {
  if (teamStore.currentTeamMeta?.isPending) {
    return [{ slot: 'loader' as const }, { label: route.meta.name as string }]
  }
  if (teamStore.currentTeamMeta?.data) {
    return [{ label: teamStore.currentTeamMeta.data?.name }, { label: route.meta.name as string }]
  }
  return [{ label: route.meta.name as string }]
})

watch(
  [
    () => route.params.id,
    () => teamStore.currentTeamMeta.data?.currentOfficer?.address,
    () => (teamStore.currentTeamMeta.data?.teamContracts ?? []).length
  ],
  async ([teamId]) => {
    if (!teamId || typeof teamId !== 'string') {
      return
    }

    if (teamId !== teamStore.currentTeamId) {
      return
    }
  },
  { immediate: true }
)

// Declare stop first so it's available in the callback
let stop: (() => void) | undefined

stop = watch(
  hasContract,
  (newValue) => {
    if (newValue && route.params.id === teamStore.currentTeamId) {
      syncWeeklyClaims({ queryParams: { teamId: route.params.id as string } })
      stop?.() // Safe call with optional chaining
    }
  },
  {
    immediate: true
  }
)

// Watch for changes in the route params then update the current team id
watch(
  () => route.params.id,
  (newId) => {
    if (newId && newId !== teamStore.currentTeamId) {
      teamStore.setCurrentTeamId(newId as string)
    }
  }
)

onUnmounted(() => {
  stop = undefined
})
</script>
<style></style>
