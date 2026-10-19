<template>
  <div class="flex flex-col gap-6">
    <BankBalanceSection v-if="bankAddress" ref="bankBalanceSection" :bank-address="bankAddress!" />
    <TokenHoldingsSection v-if="bankAddress" :rows="holdingRows" :is-loading="isLoadingHoldings" />

    <ContractOwnerCard v-if="bankAddress" :contractAddress="bankAddress" />
    <BankTransactions v-if="bankAddress" :bank-address="bankAddress!" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BankBalanceSection from '@/components/sections/BankView/BankBalanceSection.vue'
import BankTransactions from '@/components/sections/BankView/BankTransactions.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { tokenHoldingRows } from '@/utils/tokens/holdings'
import TokenHoldingsSection from '@/components/ui/TokenHoldingsSection.vue'
import ContractOwnerCard from '@/components/ui/ContractOwnerCard.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()

const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
const bankBalanceSection = ref<InstanceType<typeof BankBalanceSection> | null>(null)
const { data: holdings, isLoading: isLoadingHoldings } = useContractBalance(bankAddress)
const holdingRows = computed(() => tokenHoldingRows(holdings.value))
</script>
