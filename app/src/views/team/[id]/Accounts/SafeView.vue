<!-- filepath: app/src/views/team/[id]/Accounts/SafeView.vue -->
<template>
  <div v-if="safeAddress" class="flex flex-col gap-6">
    <SafeBalanceSection :key="safeAddress" :address="safeAddress" />

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div class="xl:col-span-3 min-w-0">
        <GenericTokenHoldingsSection :key="safeAddress" :address="safeAddress" class="h-full" />
      </div>
      <div class="xl:col-span-2 min-w-0">
        <SafeOwnersCard :address="safeAddress" />
      </div>
    </div>

    <SafeTransactions :address="safeAddress" />

    <SafeIncomingTransactions :address="safeAddress" />
  </div>

  <!-- Safe not deployed state -->
  <div v-else-if="teamId && !isLoadingSafe" class="flex items-center justify-center p-8">
    <SafeDeploymentCard :team-id="teamId" @safe-deployed="handleSafeDeployed" />
  </div>

  <!-- Loading state -->
  <div v-else class="flex items-center justify-center p-8">
    <div class="text-center">
      <div class="loading loading-spinner loading-lg"></div>
      <p class="mt-4 text-gray-500">Loading safe...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import SafeBalanceSection from '@/components/sections/SafeView/SafeBalanceSection.vue'
import SafeOwnersCard from '@/components/sections/SafeView/SafeOwnersCard.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import SafeTransactions from '@/components/sections/SafeView/SafeTransactions.vue'
import SafeIncomingTransactions from '@/components/sections/SafeView/SafeIncomingTransactions.vue'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import { useTeamStore } from '@/stores'

import { type Address } from 'viem'

const route = useRoute()
const teamStore = useTeamStore()

const isLoadingSafe = ref(false)

const teamId = computed(() => {
  const id = route.params.id as string
  return id ? parseInt(id, 10) : null
})

// Computed property to get Safe address once per render cycle
const safeAddress = computed(() => teamStore.getContractAddressByType('Safe') as Address)

/**
 * Handle successful Safe deployment
 */
const handleSafeDeployed = async () => {
  isLoadingSafe.value = true
}
</script>
