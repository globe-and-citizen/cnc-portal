<template>
  <div class="flex flex-col gap-6">
    <CashRemunerationOverview />

    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Contract Address </span>
        <AddressToolTip
          :address="teamStore.currentTeam?.teamContracts.find((contract) => contract.type === 'ExpenseAccountEIP712')?.address ?? ''"
          class="text-sm font-bold"
        />
      </div>
    </div>

    <GenericTokenHoldingsSection
      v-if="teamStore.currentTeam?.teamContracts.find((contract) => contract.type === 'CashRemunerationEIP712')"
      :address="teamStore.currentTeam?.teamContracts.find((contract) => contract.type === 'CashRemunerationEIP712')?.address ?? ''"
    />

    <CashRemunerationTable :owner-address="teamStore.currentTeam?.ownerAddress" />

    <GenericTransactionHistory
      :transactions="transactions"
      title="Cash Remuneration Transactions History"
      :currencies="['USD', 'CAD']"
      :currency-rates="{
        loading: false,
        error: null,
        getRate: () => 1
      }"
    ></GenericTransactionHistory>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTeamStore } from '@/stores'
import AddressToolTip from '@/components/AddressToolTip.vue'
import CashRemunerationTable from '@/components/sections/CashRemunerationView/CashRemunerationTable.vue'
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import type { BaseTransaction } from '@/types/transactions'
import { NETWORK } from '@/constant'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import CashRemunerationOverview from '@/components/sections/CashRemunerationView/CashRemunerationOverview.vue'

const teamStore = useTeamStore()

// Dummy data
const transactions = ref<BaseTransaction[]>([
  {
    txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
    date: Date.now(),
    type: 'Deposit',
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amountUSD: 10,
    receipt: `${NETWORK.blockExplorerUrl}/tx/0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e`
  }
])
</script>
