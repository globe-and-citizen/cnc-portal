<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-2xl">
        <p class="text-primary mb-2 text-xs font-semibold tracking-widest uppercase">
          On-chain infrastructure
        </p>
        <h1 class="text-highlighted text-2xl font-bold sm:text-3xl">Contract Management</h1>
        <p class="text-muted mt-2">
          Monitor the active contract suite, resolve governance actions and manage campaign
          contracts safely.
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="isPending"
          label="Refresh data"
          @click="refreshData"
        />
        <UButton
          color="primary"
          icon="i-lucide-megaphone"
          label="Manage campaigns"
          @click="activeView = 'campaigns'"
        />
      </div>
    </header>

    <UAlert
      v-if="isError"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Contract history could not be loaded"
      description="Current team contracts remain available. Refresh to try loading Officer generations again."
    />

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
