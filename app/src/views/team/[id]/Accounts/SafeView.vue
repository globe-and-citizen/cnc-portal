<!-- filepath: app/src/views/team/[id]/Accounts/SafeView.vue -->
<template>
  <div v-if="selectedSafe?.address" class="flex flex-col gap-6">
    <SafeBalanceSection :key="selectedSafe.address" :address="selectedSafe.address as Address" />

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div class="xl:col-span-3 min-w-0">
        <GenericTokenHoldingsSection
          :key="selectedSafe.address"
          :address="selectedSafe.address as Address"
          class="h-full"
        />
      </div>
      <div class="xl:col-span-2 min-w-0">
        <SafeOwnersCard :address="selectedSafe.address as Address" />
      </div>
    </div>

    <SafeTransactions :address="selectedSafe.address as Address" />
  </div>

  <!-- Loading or empty state -->
  <div v-else class="flex items-center justify-center p-8">
    <div class="text-center">
      <div class="loading loading-spinner loading-lg"></div>
      <p class="mt-4 text-gray-500">Loading safe...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import SafeBalanceSection from '@/components/sections/SafeView/SafeBalanceSection.vue'
import SafeOwnersCard from '@/components/sections/SafeView/SafeOwnersCard.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import SafeTransactions from '@/components/sections/SafeView/SafeTransactions.vue'

import { useTeamSafes } from '@/composables/safe'

import { type Address } from 'viem'

const { selectedSafe } = useTeamSafes()
</script>
