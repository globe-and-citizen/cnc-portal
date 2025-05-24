<template>
  <WithSafeWallet v-if="safeWalletAddress"/>
  <NoSafeWallet v-else />
</template>
<script setup lang="ts">
import NoSafeWallet from '@/components/sections/SafeWalletView/NoSafeWallet.vue'
import WithSafeWallet from '@/components/sections/SafeWalletView/WithSafeWallet.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const safeWalletAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type == 'SafeWallet'
)
</script>
