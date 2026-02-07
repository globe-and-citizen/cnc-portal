<template>
  <InvestorsSection />
  <ContractOwnerCard v-if="investorsAddress" :contractAddress="investorsAddress" />
</template>

<script setup lang="ts">
import InvestorsSection from '@/components/sections/SherTokenView/InvestorsSection.vue'
import { useTeamStore } from '@/stores/teamStore'
import { computed } from 'vue'
import ContractOwnerCard from '@/components/ContractOwnerCard.vue'

const teamStore = useTeamStore()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))

</script>
