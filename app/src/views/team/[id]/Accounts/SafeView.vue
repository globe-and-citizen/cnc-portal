<!-- filepath: app/src/views/team/[id]/Accounts/SafeView.vue -->
<template>
  <div class="flex flex-col gap-6">
    <SafeBalanceSection />

    <GenericTokenHoldingsSection
      v-if="teamStore.currentTeam?.safeAddress"
      :address="teamStore.currentTeam?.safeAddress"
    />

    <!-- Optimized layout: Safe Owners 1/3, Transactions 2/3 -->
    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <!-- Safe Owners - takes 1/3 of space on desktop -->
      <div class="xl:col-span-2 min-w-0">
        <SafeOwnersCard v-if="teamStore.currentTeam?.safeAddress" />
      </div>

      <!-- Safe Transactions - takes 2/3 of space on desktop -->
      <div class="xl:col-span-3 min-w-0">
        <SafeTransactions v-if="teamStore.currentTeam?.safeAddress" />
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
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
</script>
