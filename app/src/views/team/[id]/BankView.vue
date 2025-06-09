<template>
  <div class="flex flex-col gap-6">
    <BankBalanceSection
      v-if="typedBankAddress"
      ref="bankBalanceSection"
      :bank-address="typedBankAddress"
      @balance-updated="$forceUpdate()"
    />
    <GenericTokenHoldingsSection v-if="typedBankAddress" :address="typedBankAddress" />
    <!-- <TransactionsHistorySection /> -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { type Address } from 'viem'
import BankBalanceSection from '@/components/sections/BankView/BankBalanceSection.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
// import TransactionsHistorySection from '@/components/sections/BankView/TransactionsHistorySection.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const typedBankAddress = computed<Address | undefined>(() => {
  const bankContract = teamStore.currentTeam?.teamContracts.find(
    (contract) => contract.type === 'Bank'
  )
  return bankContract?.address as Address | undefined
})
const bankBalanceSection = ref<InstanceType<typeof BankBalanceSection> | null>(null)
</script>
