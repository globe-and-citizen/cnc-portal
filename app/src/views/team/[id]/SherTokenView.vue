<template>
  <div class="flex flex-col gap-y-8">
    <InvestorsHeader />
    <ShareholderMigrationBanner />
    <ShareholderClaimSection />
    <InvestorsActions />
    <InvestorPermissionsSection v-if="currentInvestorAddress" />
    <ShareholderList />
  </div>
  <div class="flex flex-col gap-y-8">
    <ContractOwnerCard v-if="investorsAddress" :contractAddress="investorsAddress" />
    <InvestorsTransactions />
  </div>
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores/teamStore'
import { computed } from 'vue'
import ContractOwnerCard from '@/components/ui/ContractOwnerCard.vue'
import InvestorsHeader from '@/components/sections/SherTokenView/InvestorsHeader.vue'
import InvestorsActions from '@/components/sections/SherTokenView/InvestorsActions.vue'
import ShareholderList from '@/components/sections/SherTokenView/ShareholderList.vue'
import InvestorsTransactions from '@/components/sections/SherTokenView/InvestorsTransactions.vue'
import ShareholderMigrationBanner from '@/components/sections/SherTokenView/ShareholderMigrationBanner.vue'
import ShareholderClaimSection from '@/components/sections/SherTokenView/ShareholderClaimSection.vue'
import InvestorPermissionsSection from '@/components/sections/SherTokenView/InvestorPermissionsSection.vue'

const teamStore = useTeamStore()

const investorsAddress = computed(() => teamStore.getInvestorAddress())
const currentInvestorAddress = computed(() => teamStore.getContractAddressByType('Investor'))
</script>
