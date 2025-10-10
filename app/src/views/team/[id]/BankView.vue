<template>
  <div class="flex flex-col gap-6">
    <BankBalanceSection v-if="bankAddress" ref="bankBalanceSection" :bank-address="bankAddress!" />
    <GenericTokenHoldingsSection v-if="bankAddress" :address="bankAddress!" />

    <ContractOwnerCard v-if="bankAddress" :contractAddress="bankAddress" />
    <!-- <TransactionsHistorySection /> -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
// import { type Address } from 'viem'
import BankBalanceSection from '@/components/sections/BankView/BankBalanceSection.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import ContractOwnerCard from '@/components/ContractOwnerCard.vue'
// import TransactionsHistorySection from '@/components/sections/BankView/TransactionsHistorySection.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()

const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
const bankBalanceSection = ref<InstanceType<typeof BankBalanceSection> | null>(null)
</script>
