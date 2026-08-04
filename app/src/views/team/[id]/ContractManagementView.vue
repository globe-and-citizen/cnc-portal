<template>
  <div class="space-y-6">
    <UPageHeader
      headline="On-chain infrastructure"
      title="Contract Management"
      description="Monitor the active contract suite, resolve governance actions and manage campaign contracts safely."
      :ui="{
        root: 'border-0 py-0',
        headline: 'mb-2 text-xs tracking-widest uppercase',
        title: 'text-2xl sm:text-3xl',
        description: 'mt-2 max-w-2xl text-base'
      }"
    >
      <template #links>
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
      </template>
    </UPageHeader>

    <UAlert
      v-if="isError"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Contract history could not be loaded"
      description="Current team contracts remain available. Refresh to try loading Officer generations again."
    />

    <UTabs
      v-model="activeView"
      :items="navigationItems"
      variant="link"
      aria-label="Contract management views"
      :ui="{
        root: 'items-stretch gap-6',
        list: 'overflow-x-auto',
        trigger: 'min-w-max justify-start'
      }"
    >
      <template #current>
        <MainContractSection :generation="currentGeneration" />
      </template>
      <template #campaigns>
        <AdvertiseContractSection />
      </template>
      <template #history>
        <DeploymentHistorySection :generations="legacyGenerations" />
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdvertiseContractSection from '@/components/sections/ContractManagementView/AdvertiseContractSection.vue'
import DeploymentHistorySection from '@/components/sections/ContractManagementView/DeploymentHistorySection.vue'
import MainContractSection from '@/components/sections/ContractManagementView/MainContractSection.vue'
import { useContractManagementGenerations } from '@/composables/contracts/useContractManagementGenerations'
import { useTeamStore } from '@/stores'

type ContractManagementView = 'current' | 'campaigns' | 'history'

const teamStore = useTeamStore()
const route = useRoute()
const router = useRouter()
const { currentGeneration, legacyGenerations, isPending, isError, refetch } =
  useContractManagementGenerations()

const isContractManagementView = (value: unknown): value is ContractManagementView =>
  typeof value === 'string' && ['current', 'campaigns', 'history'].includes(value)

const activeView = computed<ContractManagementView>({
  get: () => {
    const tab = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
    return isContractManagementView(tab) ? tab : 'current'
  },
  set: (tab) => {
    void router.replace({ query: { ...route.query, tab } })
  }
})

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
    slot: 'current' as const,
    icon: 'i-lucide-file-code-2',
    badge: currentContractCount.value
  },
  {
    label: 'Campaigns',
    value: 'campaigns' as const,
    slot: 'campaigns' as const,
    icon: 'i-lucide-megaphone',
    badge: campaignCount.value
  },
  {
    label: 'Deployment history',
    value: 'history' as const,
    slot: 'history' as const,
    icon: 'i-lucide-history',
    badge: legacyGenerations.value.length
  }
])

function refreshData() {
  void refetch()
}
</script>
