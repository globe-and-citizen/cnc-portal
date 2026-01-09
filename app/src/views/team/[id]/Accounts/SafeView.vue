<!-- filepath: app/src/views/team/[id]/Accounts/SafeView.vue -->
<template>
  <div class="flex flex-col gap-6">
    <SafeBalanceSection 
      ref="safeBalanceSection"  
    />
    
    <GenericTokenHoldingsSection 
      v-if="teamStore.currentTeam?.safeAddress" 
      :address="teamStore.currentTeam?.safeAddress" 
    />

    <!-- Safe Owners Card - following ContractOwnerCard pattern -->
    <SafeOwnersCard 
      v-if="teamStore.currentTeam?.safeAddress"  
    />
   

    <!-- Safe Transactions History would go here -->
    <!-- <SafeTransactionsHistorySection v-if="safeAddress" :safe-address="safeAddress" /> -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SafeBalanceSection from '@/components/sections/SafeView/SafeBalanceSection.vue'
import SafeOwnersCard from '@/components/sections/SafeView/SafeOwnersCard.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
</script>