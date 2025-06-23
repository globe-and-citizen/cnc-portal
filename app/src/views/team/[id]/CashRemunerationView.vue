<template>
  <div class="flex flex-col gap-6">
    <CashRemunerationOverview />

    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Contract Address </span>
        <AddressToolTip
          :address="teamStore.getContractAddressByType('CashRemunerationEIP712') ?? ''"
          class="text-sm font-bold"
        />
      </div>
    </div>
    <GenericTokenHoldingsSection
      v-if="teamStore.getContractAddressByType('CashRemunerationEIP712') ?? ''"
      :address="teamStore.getContractAddressByType('CashRemunerationEIP712') ?? ''"
    />

    <PendingWeeklyClaim v-if="isTeamOwner" />
    <SignedWeeklyClaim />

    <!-- <CashRemunerationTable :owner-address="teamStore.currentTeam?.ownerAddress" /> -->
    <!-- <CashRemunerationTransactions /> -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import AddressToolTip from '@/components/AddressToolTip.vue'

// import CashRemunerationTransactions from '@/components/sections/CashRemunerationView/CashRemunerationTransactions.vue'
// import CashRemunerationTable from '@/components/sections/CashRemunerationView/CashRemunerationTable.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import CashRemunerationOverview from '@/components/sections/CashRemunerationView/CashRemunerationOverview.vue'
import PendingWeeklyClaim from '@/components/sections/CashRemunerationView/PendingWeeklyClaim.vue'
import SignedWeeklyClaim from '@/components/sections/CashRemunerationView/SignedWeeklyClaim.vue'

const userStore = useUserDataStore()
const teamStore = useTeamStore()

const isTeamOwner = computed(() => {
  return teamStore.currentTeam?.ownerAddress === userStore.address
})
</script>
