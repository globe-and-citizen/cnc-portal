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
  getTvlStats,
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
const tabs = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', value: 'overview', slot: 'overview' },
  { label: 'Teams', icon: 'i-lucide-users', value: 'teams', slot: 'teams' },
  { label: 'Users', icon: 'i-lucide-user', value: 'users', slot: 'users' },
  { label: 'Claims', icon: 'i-lucide-file-text', value: 'claims', slot: 'claims' },
  { label: 'Wages', icon: 'i-lucide-dollar-sign', value: 'wages', slot: 'wages' },
  { label: 'Expenses', icon: 'i-lucide-receipt', value: 'expenses', slot: 'expenses' },
  { label: 'Contracts', icon: 'i-lucide-file-signature', value: 'contracts', slot: 'contracts' },
  { label: 'Actions', icon: 'i-lucide-zap', value: 'actions', slot: 'actions' },
  { label: 'Activity', icon: 'i-lucide-activity', value: 'activity', slot: 'activity' },
  { label: 'TVL', icon: 'i-lucide-lock', value: 'tvl', slot: 'tvl' }
]

// Persist the active tab in the URL (?tab=) so a reload — or a shared link —
// restores the same tab. `replace` keeps it out of the history stack; an
// unknown value falls back to the first tab.
const route = useRoute()
const router = useRouter()
const tabValues = tabs.map(tab => tab.value)

const activeTab = computed({
  get: () => {
    const tab = route.query.tab
    return typeof tab === 'string' && tabValues.includes(tab) ? tab : 'overview'
  },
  set: (tab) => {
    router.replace({ query: { ...route.query, tab } })
  }
})

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

// TVL is a live on-chain snapshot — independent of the selected period.
const { data: tvlData, refresh: refreshTvl } = await useAsyncData('stats-tvl', () => getTvlStats())

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
    refreshActivity(),
    refreshTvl()
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
          :items="periodOptions"
          value-key="value"
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
      <UTabs v-model="activeTab" :items="tabs" class="w-full">
        <template #overview>
          <StatsOverviewSection :data="overviewData" :is-loading="isLoading" />
        </template>

        <template #teams>
          <StatsTeamsSection :data="teamsData" :is-loading="isLoading" />
        </template>

        <template #users>
          <StatsUsersSection :data="usersData" :is-loading="isLoading" />
        </template>

        <template #claims>
          <StatsClaimsSection :data="claimsData" :is-loading="isLoading" />
        </template>

        <template #wages>
          <StatsWagesSection :data="wagesData" :is-loading="isLoading" />
        </template>

        <template #expenses>
          <StatsExpensesSection :data="expensesData" :is-loading="isLoading" />
        </template>

        <template #contracts>
          <StatsContractsSection :data="contractsData" :is-loading="isLoading" />
        </template>

        <template #actions>
          <StatsActionsSection :data="actionsData" :is-loading="isLoading" />
        </template>

        <template #activity>
          <StatsActivitySection :data="activityData" :is-loading="isLoading" />
        </template>

        <template #tvl>
          <StatsTvlSection :data="tvlData" :is-loading="isLoading" />
        </template>
      </UTabs>
    </div>
  </div>
</template>
