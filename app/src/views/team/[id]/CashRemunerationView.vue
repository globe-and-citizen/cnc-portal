<template>
  <div class="flex flex-col gap-6">
    <CashRemunerationOverview />

    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Contract Address </span>
        <AddressToolTip
          :address="
            teamStore.currentTeam?.teamContracts.find(
              (contract) => contract.type === 'CashRemunerationEIP712'
            )?.address ?? ''
          "
          class="text-sm font-bold"
        />
      </div>
    </div>
    <GenericTokenHoldingsSection
      v-if="
        teamStore.currentTeam?.teamContracts.find(
          (contract) => contract.type === 'CashRemunerationEIP712'
        )
      "
      :address="
        teamStore.currentTeam?.teamContracts.find(
          (contract) => contract.type === 'CashRemunerationEIP712'
        )?.address ?? ('' as Address)
      "
    />

    <CashRemunerationWeeklyClaim />

    <!-- <CashRemunerationTable :owner-address="teamStore.currentTeam?.ownerAddress" /> -->
    <!-- <CashRemunerationTransactions /> -->
  </div>
</template>

<script setup lang="ts">
import type { Address } from 'viem'
import { useTeamStore } from '@/stores'
import AddressToolTip from '@/components/AddressToolTip.vue'
// import CashRemunerationTransactions from '@/components/sections/CashRemunerationView/CashRemunerationTransactions.vue'
// import CashRemunerationTable from '@/components/sections/CashRemunerationView/CashRemunerationTable.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import CashRemunerationOverview from '@/components/sections/CashRemunerationView/CashRemunerationOverview.vue'
import CashRemunerationWeeklyClaim from '@/components/sections/CashRemunerationView/CashRemunerationWeeklyClaim.vue'
const teamStore = useTeamStore()
</script>
