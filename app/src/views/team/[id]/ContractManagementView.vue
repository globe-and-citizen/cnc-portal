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
          @click="activeTab = 'campaigns'"
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
      v-model="activeTab"
      :items="tabItems"
      variant="link"
      aria-label="Contract management views"
      :ui="{
        root: 'items-stretch gap-6',
        list: 'overflow-x-auto',
        trigger: 'min-w-max justify-start'
      }"
    >
      <template #current>
        <CurrentOfficerContractsSection :generation="currentGeneration" />
      </template>
      <template #campaigns>
        <AdvertisingCampaignsSection />
      </template>
      <template #history>
        <OfficerDeploymentHistorySection :generations="legacyGenerations" />
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdvertisingCampaignsSection from '@/components/sections/ContractManagementView/AdvertisingCampaignsSection.vue'
import OfficerDeploymentHistorySection from '@/components/sections/ContractManagementView/OfficerDeploymentHistorySection.vue'
import CurrentOfficerContractsSection from '@/components/sections/ContractManagementView/CurrentOfficerContractsSection.vue'
import { useGetTeamOfficersQuery } from '@/queries/contract.queries'
import { useTeamStore } from '@/stores'
import type { ContractGeneration } from '@/types/deployments'
import { contractsInUse } from '@/utils/safe/teamSafes'

type ContractManagementTab = 'current' | 'campaigns' | 'history'

const teamStore = useTeamStore()
const route = useRoute()
const router = useRouter()
const officersQuery = useGetTeamOfficersQuery({
  queryParams: { teamId: () => teamStore.currentTeamId ?? '' }
})
const generations = computed<ContractGeneration[]>(() => {
  const officers = officersQuery.data.value ?? []

  if (officers.length) {
    return officers.map((officer) => ({
      key: officer.id,
      version: officer.version,
      officerAddress: officer.address,
      isCurrent: officer.isCurrent,
      contracts: officer.isCurrent
        ? contractsInUse(teamStore.currentTeam?.teamContracts)
        : officer.contracts
    }))
  }

  const currentOfficer = teamStore.currentTeam?.currentOfficer
  if (!currentOfficer) return []

  return [
    {
      key: currentOfficer.id,
      version: currentOfficer.version,
      officerAddress: currentOfficer.address,
      isCurrent: true,
      contracts: contractsInUse(teamStore.currentTeam?.teamContracts)
    }
  ]
})
const currentGeneration = computed(() =>
  generations.value.find((generation) => generation.isCurrent)
)
const legacyGenerations = computed(() =>
  generations.value.filter((generation) => !generation.isCurrent)
)
const isPending = officersQuery.isPending
const isError = officersQuery.isError

const isContractManagementTab = (value: unknown): value is ContractManagementTab =>
  typeof value === 'string' && ['current', 'campaigns', 'history'].includes(value)

const activeTab = computed<ContractManagementTab>({
  get: () => {
    const tab = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
    return isContractManagementTab(tab) ? tab : 'current'
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

const tabItems = computed(() => [
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
  void officersQuery.refetch()
}
</script>
