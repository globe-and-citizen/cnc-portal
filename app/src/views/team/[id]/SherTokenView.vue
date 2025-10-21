<template>
  <InvestorsSection :team="team!" />
  <ContractOwnerCard v-if="investorsAddress" :contractAddress="investorsAddress" />
</template>

<script setup lang="ts">
import InvestorsSection from '@/components/sections/SherTokenView/InvestorsSection.vue'
import { useTeamStore } from '@/stores/teamStore'
import { ref, onMounted, computed } from 'vue'
import ContractOwnerCard from '@/components/ContractOwnerCard.vue'
const teamStore = useTeamStore()
const team = ref(teamStore.currentTeam)

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))

onMounted(() => {
  team.value = teamStore.currentTeam
})
</script>
