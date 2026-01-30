<!-- filepath: app/src/views/team/[id]/Accounts/SafeView.vue -->
<template>
  <div class="flex flex-col gap-6">
    <SafeBalanceSection v-if="selectedSafe?.address" :address="selectedSafe?.address as Address" />

    <GenericTokenHoldingsSection
      :key="selectedSafe?.address"
      :address="selectedSafe?.address as Address"
    />

    <!-- Optimized layout: Safe Owners 1/3, Transactions 2/3 -->
    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <!-- Safe Owners - takes 1/3 of space on desktop -->
      <div class="xl:col-span-2 min-w-0">
        <SafeOwnersCard :address="selectedSafe?.address" />
      </div>

      <!-- Safe Transactions - takes 2/3 of space on desktop -->
      <div class="xl:col-span-3 min-w-0">
        <SafeTransactions :address="selectedSafe?.address as Address" />
      </div>
    </div>

    <!-- Safe Transactions History would go here -->
    <!-- <SafeTransactionsHistorySection v-if="safeAddress" :safe-address="safeAddress" /> -->
  </div>
</template>

<script setup lang="ts">
import SafeBalanceSection from '@/components/sections/SafeView/SafeBalanceSection.vue'
import SafeOwnersCard from '@/components/sections/SafeView/SafeOwnersCard.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import SafeTransactions from '@/components/sections/SafeView/SafeTransactions.vue'

import { useTeamSafes } from '@/composables/safe'
import { watch } from 'vue'
import { type Address } from 'viem'

const { safes, selectedSafe } = useTeamSafes()

watch(
  [safes, selectedSafe],
  ([newSafes, newSelectedSafe]) => {
    console.log('Team Safes updated: ', newSafes)
    console.log('Selected safe: ', newSelectedSafe)
  },
  { immediate: true }
)
</script>
