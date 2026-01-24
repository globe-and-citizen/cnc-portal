<template>
  <div class="flex flex-col gap-6">
    <CashRemunerationOverview />

    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Contract Address </span>

        <AddressToolTip v-if="cashRemunerationAddress" :address="cashRemunerationAddress" class="text-sm font-bold" />
      </div>
    </div>
    <GenericTokenHoldingsSection v-if="cashRemunerationAddress" :address="cashRemunerationAddress" />
    <CRWeeklyClaimOwnerHeader />

    <ContractOwnerCard v-if="cashRemunerationAddress" :contractAddress="cashRemunerationAddress" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTeamStore } from '@/stores'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ContractOwnerCard from '@/components/ContractOwnerCard.vue'

import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import CashRemunerationOverview from '@/components/sections/CashRemunerationView/CashRemunerationOverview.vue'
import CRWeeklyClaimOwnerHeader from '@/components/sections/CashRemunerationView/CRWeeklyClaimOwnerHeader.vue'

// const userStore = useUserDataStore()
const teamStore = useTeamStore()

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

</script>
