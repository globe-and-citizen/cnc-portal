<!-- filepath: app/src/views/team/[id]/Accounts/SafeView.vue -->
<template>
  <div v-if="selectedSafe?.address" class="flex flex-col gap-6">
    <SafeBalanceSection :key="selectedSafe.address" :address="selectedSafe.address as Address" />

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div class="min-w-0 xl:col-span-3">
        <GenericTokenHoldingsSection
          :key="selectedSafe.address"
          :address="selectedSafe.address as Address"
          class="h-full"
        />
      </div>
      <div class="min-w-0 xl:col-span-2">
        <SafeOwnersCard :address="selectedSafe.address as Address" />
      </div>
    </div>

    <SafeTransactions :address="selectedSafe.address as Address" />

    <SafeIncomingTransactions :address="selectedSafe.address as Address" />
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
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SafeBalanceSection from '@/components/sections/SafeView/SafeBalanceSection.vue'
import SafeOwnersCard from '@/components/sections/SafeView/SafeOwnersCard.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import SafeTransactions from '@/components/sections/SafeView/SafeTransactions.vue'
import SafeIncomingTransactions from '@/components/sections/SafeView/SafeIncomingTransactions.vue'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'

import { useTeamSafes } from '@/composables/safe'

import { type Address } from 'viem'

const route = useRoute()

const { selectedSafe } = useTeamSafes()

watch(
  selectedSafe,
  (newVal) => {
    console.log('selectedSafe:', newVal)
  },
  { immediate: true }
)

const isLoadingSafe = ref(false)

const teamId = computed(() => {
  const id = route.params.id as string
  return id ? parseInt(id, 10) : null
})

/**
 * Handle successful Safe deployment
 */
const handleSafeDeployed = async () => {
  isLoadingSafe.value = true
}
</script>
