<script setup lang="ts">
import type { StatsPeriod } from '~/types'

definePageMeta({
  title: 'Statistics',
  description: 'Platform-wide statistics and analytics'
})

const {
  getOverviewStats,
  getTeamsStats,
  getUsersStats,
  getClaimsStats,
  getWagesStats,
  getExpensesStats,
  getContractsStats,
  getActionsStats,
  getRecentActivity,
  isLoading,
  error
} = useStats()

// Period selector
const selectedPeriod = ref<StatsPeriod>('30d')
const periodOptions = [
  { label: 'Last 7 Days', value: '7d' as StatsPeriod },
  { label: 'Last 30 Days', value: '30d' as StatsPeriod },
  { label: 'Last 90 Days', value: '90d' as StatsPeriod },
  { label: 'All Time', value: 'all' as StatsPeriod }
]

// Tab management
const selectedTab = ref(0)
const tabs = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard' },
  { label: 'Teams', icon: 'i-lucide-users' },
  { label: 'Users', icon: 'i-lucide-user' },
  { label: 'Claims', icon: 'i-lucide-file-text' },
  { label: 'Wages', icon: 'i-lucide-dollar-sign' },
  { label: 'Expenses', icon: 'i-lucide-receipt' },
  { label: 'Contracts', icon: 'i-lucide-file-signature' },
  { label: 'Actions', icon: 'i-lucide-zap' },
  { label: 'Activity', icon: 'i-lucide-activity' }
]

// Fetch stats data
const { data: overviewData, refresh: refreshOverview } = await useAsyncData(
  'stats-overview',
  () => getOverviewStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

const { data: teamsData, refresh: refreshTeams } = await useAsyncData(
  'stats-teams',
  () => getTeamsStats(selectedPeriod.value, 1, 10),
  { watch: [selectedPeriod] }
)

const { data: usersData, refresh: refreshUsers } = await useAsyncData(
  'stats-users',
  () => getUsersStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

const { data: claimsData, refresh: refreshClaims } = await useAsyncData(
  'stats-claims',
  () => getClaimsStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

const { data: wagesData, refresh: refreshWages } = await useAsyncData(
  'stats-wages',
  () => getWagesStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

const { data: expensesData, refresh: refreshExpenses } = await useAsyncData(
  'stats-expenses',
  () => getExpensesStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

const { data: contractsData, refresh: refreshContracts } = await useAsyncData(
  'stats-contracts',
  () => getContractsStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

const { data: actionsData, refresh: refreshActions } = await useAsyncData(
  'stats-actions',
  () => getActionsStats(selectedPeriod.value),
  { watch: [selectedPeriod] }
)

const { data: activityData, refresh: refreshActivity } = await useAsyncData(
  'stats-activity',
  () => getRecentActivity(50),
  { watch: [selectedPeriod] }
)

// Refresh all stats
const refreshAll = async () => {
  await Promise.all([
    refreshOverview(),
    refreshTeams(),
    refreshUsers(),
    refreshClaims(),
    refreshWages(),
    refreshExpenses(),
    refreshContracts(),
    refreshActions(),
    refreshActivity()
  ])
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Statistics
        </h1>
        <p class="text-sm text-muted mt-1">
          Comprehensive platform analytics and insights
        </p>
      </div>
      <div class="flex items-center gap-3">
        <USelectMenu
          v-model="selectedPeriod"
          :options="periodOptions"
          value-attribute="value"
          option-attribute="label"
          placeholder="Select period"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="isLoading"
          @click="refreshAll"
        >
          Refresh
        </UButton>
      </div>
    </div>

    <!-- Error Alert -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      title="Error loading statistics"
      :description="error.message"
    />

    <!-- Tabs Navigation -->
    <div class="space-y-6">
      <UTabs v-model="selectedTab" :items="tabs" class="w-full" />

      <!-- Tab Content -->
      <div class="mt-6">
        <!-- Overview Tab -->
        <div v-if="selectedTab === 0" class="space-y-6">
          <StatsOverviewSection :data="overviewData" :is-loading="isLoading" />
        </div>

        <!-- Teams Tab -->
        <div v-else-if="selectedTab === 1" class="space-y-6">
          <StatsTeamsSection :data="teamsData" :is-loading="isLoading" />
        </div>

        <!-- Users Tab -->
        <div v-else-if="selectedTab === 2" class="space-y-6">
          <StatsUsersSection :data="usersData" :is-loading="isLoading" />
        </div>

        <!-- Claims Tab -->
        <div v-else-if="selectedTab === 3" class="space-y-6">
          <StatsClaimsSection :data="claimsData" :is-loading="isLoading" />
        </div>

        <!-- Wages Tab -->
        <div v-else-if="selectedTab === 4" class="space-y-6">
          <StatsWagesSection :data="wagesData" :is-loading="isLoading" />
        </div>

        <!-- Expenses Tab -->
        <div v-else-if="selectedTab === 5" class="space-y-6">
          <StatsExpensesSection :data="expensesData" :is-loading="isLoading" />
        </div>

        <!-- Contracts Tab -->
        <div v-else-if="selectedTab === 6" class="space-y-6">
          <StatsContractsSection :data="contractsData" :is-loading="isLoading" />
        </div>

        <!-- Actions Tab -->
        <div v-else-if="selectedTab === 7" class="space-y-6">
          <StatsActionsSection :data="actionsData" :is-loading="isLoading" />
        </div>

        <!-- Activity Tab -->
        <div v-else-if="selectedTab === 8" class="space-y-6">
          <StatsActivitySection :data="activityData" :is-loading="isLoading" />
        </div>
      </div>
    </div>
  </div>
</template>
