<script setup lang="ts">
import type { StatsOverview } from '~/types'

defineProps<{
  data: StatsOverview | null | undefined
  isLoading: boolean
}>()

const formatNumber = (value: number) => value?.toLocaleString('en-US') || '0'
const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value?.toFixed(1) || 0}%`
</script>

<template>
  <div class="space-y-6">
    <!-- Primary Stats Grid -->
    <UPageGrid class="lg:grid-cols-4">
      <!-- Teams Card -->
      <UPageCard
        icon="i-lucide-users"
        title="Total Teams"
        variant="subtle"
        :ui="{
          container: 'gap-y-2',
          leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25'
        }"
      >
        <template v-if="isLoading">
          <USkeleton class="h-8 w-24" />
        </template>
        <template v-else-if="data">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-semibold text-highlighted">
              {{ formatNumber(data.totalTeams) }}
            </span>
            <UBadge
              :color="data.growthMetrics.teamsGrowth > 0 ? 'success' : 'error'"
              variant="subtle"
              class="text-xs"
            >
              {{ formatPercent(data.growthMetrics.teamsGrowth) }}
            </UBadge>
          </div>
        </template>
      </UPageCard>

      <!-- Members Card -->
      <UPageCard
        icon="i-lucide-user"
        title="Total Members"
        variant="subtle"
        :ui="{
          container: 'gap-y-2',
          leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25'
        }"
      >
        <template v-if="isLoading">
          <USkeleton class="h-8 w-24" />
        </template>
        <template v-else-if="data">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-semibold text-highlighted">
              {{ formatNumber(data.totalMembers) }}
            </span>
            <UBadge
              :color="data.growthMetrics.membersGrowth > 0 ? 'success' : 'error'"
              variant="subtle"
              class="text-xs"
            >
              {{ formatPercent(data.growthMetrics.membersGrowth) }}
            </UBadge>
          </div>
        </template>
      </UPageCard>

      <!-- Claims Card -->
      <UPageCard
        icon="i-lucide-file-text"
        title="Total Claims"
        variant="subtle"
        :ui="{
          container: 'gap-y-2',
          leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25'
        }"
      >
        <template v-if="isLoading">
          <USkeleton class="h-8 w-24" />
        </template>
        <template v-else-if="data">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-semibold text-highlighted">
              {{ formatNumber(data.totalClaims) }}
            </span>
            <UBadge
              :color="data.growthMetrics.claimsGrowth > 0 ? 'success' : 'error'"
              variant="subtle"
              class="text-xs"
            >
              {{ formatPercent(data.growthMetrics.claimsGrowth) }}
            </UBadge>
          </div>
        </template>
      </UPageCard>

      <!-- Contracts Card -->
      <UPageCard
        icon="i-lucide-file-signature"
        title="Total Contracts"
        variant="subtle"
        :ui="{
          container: 'gap-y-2',
          leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25'
        }"
      >
        <template v-if="isLoading">
          <USkeleton class="h-8 w-24" />
        </template>
        <template v-else-if="data">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-semibold text-highlighted">
              {{ formatNumber(data.totalContracts) }}
            </span>
          </div>
        </template>
      </UPageCard>
    </UPageGrid>

    <!-- Secondary Stats Grid -->
    <UPageGrid class="lg:grid-cols-3">
      <!-- Claims Card -->
      <UPageCard title="Claims Overview" variant="subtle">
        <template v-if="isLoading">
          <USkeleton class="h-6 w-32 mb-2" />
          <USkeleton class="h-6 w-24" />
        </template>
        <template v-else-if="data">
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted">Total Hours</span>
              <span class="font-medium">{{ formatNumber(data.totalHoursWorked) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted">Weekly Claims</span>
              <span class="font-medium">{{ formatNumber(data.totalWeeklyClaims) }}</span>
            </div>
          </div>
        </template>
      </UPageCard>

      <!-- Actions Card -->
      <UPageCard title="Board Actions" variant="subtle">
        <template v-if="isLoading">
          <USkeleton class="h-6 w-32 mb-2" />
          <USkeleton class="h-6 w-24" />
        </template>
        <template v-else-if="data">
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted">Total Actions</span>
              <span class="font-medium">{{ formatNumber(data.totalActions) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted">Execution Rate</span>
              <span class="font-medium">{{ formatPercent(data.actionsExecutionRate) }}</span>
            </div>
          </div>
        </template>
      </UPageCard>

      <!-- Notifications Card -->
      <UPageCard title="Notifications" variant="subtle">
        <template v-if="isLoading">
          <USkeleton class="h-6 w-32 mb-2" />
          <USkeleton class="h-6 w-24" />
        </template>
        <template v-else-if="data">
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted">Total</span>
              <span class="font-medium">{{ formatNumber(data.totalNotifications) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted">Read Rate</span>
              <span class="font-medium">{{ formatPercent(data.notificationReadRate) }}</span>
            </div>
          </div>
        </template>
      </UPageCard>
    </UPageGrid>

    <!-- Additional Metrics -->
    <UPageCard title="Platform Metrics" variant="subtle">
      <template v-if="isLoading">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="space-y-1">
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-6 w-16" />
          </div>
        </div>
      </template>
      <template v-else-if="data">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wider">
              Active Teams
            </p>
            <p class="text-lg font-semibold">
              {{ formatNumber(data.activeTeams) }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wider">
              Total Expenses
            </p>
            <p class="text-lg font-semibold">
              {{ formatNumber(data.totalExpenses) }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wider">
              Total Contracts
            </p>
            <p class="text-lg font-semibold">
              {{ formatNumber(data.totalContracts) }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wider">
              Hours Worked
            </p>
            <p class="text-lg font-semibold">
              {{ formatNumber(data.totalHoursWorked) }}
            </p>
          </div>
        </div>
      </template>
    </UPageCard>
  </div>
</template>
