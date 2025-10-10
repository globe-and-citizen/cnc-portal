<template>
  <div class="flex flex-col gap-y-8">
    <!-- TODO move it to the top of the page when cash remuneration will have his own page -->
    <!-- Cash Remuneration stats: Only apear for owner -->
    <ExpenseStatsSection />
    <GenericTokenHoldingsSection v-if="expenseContractAddress" :address="expenseContractAddress!" />

    <MyApprovedExpenseSection />

    <ApprovedExpensesSection />

    <!-- <TransactionHistorySection /> -->
    <ContractOwnerCard v-if="expenseContractAddress" :contractAddress="expenseContractAddress" />
  </div>
</template>

<script setup lang="ts">
//#region Imports
import ExpenseStatsSection from '@/components/sections/ExpenseAccountView/ExpenseStatsSection.vue'
// import TransactionHistorySection from '@/components/sections/ExpenseAccountView/TransactionHistorySection.vue'
import MyApprovedExpenseSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import ApprovedExpensesSection from '@/components/sections/ExpenseAccountView/ApprovedExpensesSection.vue'
import { useTeamStore } from '@/stores'
import { computed } from 'vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import ContractOwnerCard from '@/components/ContractOwnerCard.vue'
//#endregion
const teamStore = useTeamStore()

const expenseContractAddress = computed(() =>
  teamStore.getContractAddressByType('ExpenseAccountEIP712')
)
</script>
