<script setup lang="ts">
import type { Period, Range, Stat, StatsPeriod } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

const { getOverviewStats } = useStats()

function formatNumber(value: number): string | number {
  return value.toLocaleString('en-US')
}

// Map UI period to API period format
const apiPeriod = computed<StatsPeriod>(() => {
  const periodMap: Record<Period, StatsPeriod> = {
    daily: '7d',
    weekly: '30d',
    monthly: '90d'
  }
  return periodMap[props.period] || '30d'
})

const { data: stats, pending, error } = await useAsyncData<Stat[]>(
  'home-stats',
  async () => {
    const overviewData = await getOverviewStats(apiPeriod.value)

    if (!overviewData) {
      // Return empty stats if API fails
      return []
    }

    return [
      {
        title: 'Teams',
        icon: 'i-lucide-users',
        value: formatNumber(overviewData.totalTeams),
        variation: overviewData.growthMetrics.teamsGrowth
      },
      {
        title: 'Members',
        icon: 'i-lucide-chart-pie',
        value: formatNumber(overviewData.totalMembers),
        variation: overviewData.growthMetrics.membersGrowth
      },
      {
        title: 'Total Claims',
        icon: 'i-lucide-file-text',
        value: formatNumber(overviewData.totalClaims),
        variation: overviewData.growthMetrics.claimsGrowth
      },
      {
        title: 'Total Hours',
        icon: 'i-lucide-clock',
        value: formatNumber(overviewData.totalHoursWorked),
        variation: 0
      }
    ]
  },
  {
    watch: [apiPeriod],
    default: () => []
  }
)
</script>

<template>
  <!-- Loading State -->
  <UPageGrid v-if="pending" class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="index in 4"
      :key="index"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg"
    >
      <USkeleton class="h-8 w-24" />
      <USkeleton class="h-4 w-16 mt-2" />
    </UPageCard>
  </UPageGrid>

  <!-- Error State -->
  <UAlert
    v-else-if="error"
    icon="i-lucide-alert-circle"
    color="error"
    variant="subtle"
    title="Failed to load statistics"
    :description="error.message || 'Please try again later'"
    class="mb-4"
  />

  <!-- Stats Data -->
  <UPageGrid v-else class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      to="/customers"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <UBadge :color="stat.variation > 0 ? 'success' : 'error'" variant="subtle" class="text-xs">
          {{ stat.variation > 0 ? '+' : '' }}{{ stat.variation.toFixed(1) }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
