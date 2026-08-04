<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-2xl">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="subtle">Smart contracts</UBadge>
          <UBadge v-if="currentGeneration" color="success" variant="soft">
            {{ currentGeneration.version || 'Current generation' }}
          </UBadge>
        </div>
        <h1 class="text-highlighted text-2xl font-bold sm:text-3xl">Contract Management</h1>
        <p class="text-muted mt-2">
          Monitor active contracts, manage advertising campaigns and recover funds from archived
          deployments.
        </p>
      </div>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-refresh-cw"
        :loading="isPending"
        label="Refresh data"
        @click="refreshData"
      />
    </header>

    <UAlert
      v-if="isError"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Contract history could not be loaded"
      description="Current team contracts remain available. Refresh to try loading Officer generations again."
    />

    <section class="grid gap-3 sm:grid-cols-3" aria-label="Contract overview">
      <UCard v-for="metric in metrics" :key="metric.label" variant="subtle">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-muted text-sm">{{ metric.label }}</p>
            <p class="text-highlighted mt-1 text-2xl font-semibold">{{ metric.value }}</p>
          </div>
          <div class="bg-muted flex size-10 items-center justify-center rounded-lg">
            <UIcon :name="metric.icon" class="text-primary size-5" />
          </div>
        </div>
      </UCard>
    </section>

    <nav class="border-default overflow-x-auto border-b" aria-label="Contract management views">
      <div class="flex min-w-max gap-1" role="tablist">
        <UButton
          v-for="item in navigationItems"
          :key="item.value"
          :icon="item.icon"
          color="neutral"
          :variant="activeView === item.value ? 'soft' : 'ghost'"
          :aria-selected="activeView === item.value"
          role="tab"
          class="rounded-b-none"
          @click="activeView = item.value"
        >
          {{ item.label }}
          <UBadge v-if="item.count !== undefined" color="neutral" variant="subtle" size="sm">
            {{ item.count }}
          </UBadge>
        </UButton>
      </div>
    </nav>

    <MainContractSection v-if="activeView === 'current'" :generation="currentGeneration" />
    <AdvertiseContractSection v-else-if="activeView === 'campaigns'" />
    <DeploymentHistorySection v-else :generations="legacyGenerations" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AdvertiseContractSection from '@/components/sections/ContractManagementView/AdvertiseContractSection.vue'
import DeploymentHistorySection from '@/components/sections/ContractManagementView/DeploymentHistorySection.vue'
import MainContractSection from '@/components/sections/ContractManagementView/MainContractSection.vue'
import { useContractManagementGenerations } from '@/composables/contracts/useContractManagementGenerations'
import { useTeamStore } from '@/stores'

type ContractManagementView = 'current' | 'campaigns' | 'history'

const teamStore = useTeamStore()
const activeView = ref<ContractManagementView>('current')
const { currentGeneration, legacyGenerations, isPending, isError, refetch } =
  useContractManagementGenerations()

const campaignCount = computed(
  () =>
    teamStore.currentTeam?.teamContracts.filter((contract) => contract.type === 'Campaign')
      .length ?? 0
)
const currentContractCount = computed(
  () =>
    currentGeneration.value?.contracts.filter((contract) => contract.type !== 'Campaign').length ??
    0
)

const metrics = computed(() => [
  { label: 'Current contracts', value: currentContractCount.value, icon: 'i-lucide-file-code-2' },
  { label: 'Campaigns', value: campaignCount.value, icon: 'i-lucide-megaphone' },
  { label: 'Archived generations', value: legacyGenerations.value.length, icon: 'i-lucide-history' }
])

const navigationItems = computed(() => [
  {
    label: 'Current contracts',
    value: 'current' as const,
    icon: 'i-lucide-file-code-2',
    count: currentContractCount.value
  },
  {
    label: 'Campaigns',
    value: 'campaigns' as const,
    icon: 'i-lucide-megaphone',
    count: campaignCount.value
  },
  {
    label: 'Deployment history',
    value: 'history' as const,
    icon: 'i-lucide-history',
    count: legacyGenerations.value.length
  }
])

function refreshData() {
  void refetch()
}
</script>
