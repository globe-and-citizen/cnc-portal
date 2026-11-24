<template>
  <div class="flex gap-6">
    <ExpenseAccountBalance />
    <ExpenseMonthSpent />
    <ExpenseAccountTotalApproved />
  </div>

  <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
    <OwnerTreasuryWithdrawAction contractType="ExpenseAccountEIP712" />

    <div
      class="ml-auto flex flex-wrap justify-end gap-2 sm:gap-4"
      data-test="expense-account-address"
    >
      <span class="text-sm">Expense Account Address</span>
      <AddressTooltip :address="expenseAccountEip712Address ?? ''" class="text-sm font-bold" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Address } from 'viem'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import ExpenseAccountBalance from '@/components/sections/ExpenseAccountView/ExpenseAccountBalance.vue'
import ExpenseAccountTotalApproved from '@/components/sections/ExpenseAccountView/ExpenseAccountTotalApproved.vue'
import ExpenseMonthSpent from '@/components/sections/ExpenseAccountView/ExpenseMonthSpent.vue'
import OwnerTreasuryWithdrawAction from '@/components/sections/OwnerTreasuryWithdrawAction.vue'
import { computed } from 'vue'
import { useTeamStore } from '@/stores'

//#region  Composables
const teamStore = useTeamStore()
const expenseAccountEip712Address = computed(
  () => teamStore.getContractAddressByType('ExpenseAccountEIP712') as Address
)
</script>
