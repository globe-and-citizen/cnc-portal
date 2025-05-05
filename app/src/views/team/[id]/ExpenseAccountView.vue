<template>
  <div class="flex flex-col gap-y-8">
    <!-- TODO move it to the top of the page when cash remuneration will have his own page -->
    <!-- Cash Remuneration stats: Only apear for owner -->
    <ExpenseStatsSection />

    <GenericTokenHoldingsSection
      v-if="
        teamStore.currentTeam?.teamContracts.find(
          (contract) => contract.type === 'ExpenseAccountEIP712'
        )
      "
      :address="
        teamStore.currentTeam?.teamContracts.find(
          (contract) => contract.type === 'ExpenseAccountEIP712'
        )?.address || ''
      "
    />

    <MyApprovedExpenseSection />

    <ApprovedExpensesSection />

    <TransactionHistorySection />
  </div>
</template>

<script setup lang="ts">
//#region Imports
import ExpenseStatsSection from '@/components/sections/ExpenseAccountView/ExpenseStatsSection.vue'
import TransactionHistorySection from '@/components/sections/ExpenseAccountView/TransactionHistorySection.vue'
import MyApprovedExpenseSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import ApprovedExpensesSection from '@/components/sections/ExpenseAccountView/ApprovedExpensesSection.vue'
import { useTeamStore } from '@/stores'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
//#endregion
const teamStore = useTeamStore()
</script>
