<template>
  <div class="flex gap-6">
    <ExpenseAccountBalance />
    <ExpenseMonthSpent />
    <ExpenseAccountTotalApproved />
  </div>

  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <OwnerTreasuryWithdrawAction contractType="ExpenseAccountEIP712" />

    <div
      class="ml-auto flex flex-wrap justify-end gap-2 sm:gap-4"
      data-test="expense-account-address"
    >
      <span class="text-sm">Expense Account Address</span>
      <AddressToolTip :address="expenseAccountEip712Address ?? ''" class="text-sm font-bold" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useTeamStore } from '@/stores'
import { type Address } from 'viem'
import ExpenseAccountBalance from '@/components/sections/ExpenseAccountView/ExpenseAccountBalance.vue'
import ExpenseMonthSpent from '@/components/sections/ExpenseAccountView/ExpenseMonthSpent.vue'
import ExpenseAccountTotalApproved from '@/components/sections/ExpenseAccountView/ExpenseAccountTotalApproved.vue'
import OwnerTreasuryWithdrawAction from '@/components/sections/OwnerTreasuryWithdrawAction.vue'

//#region  Composables
const teamStore = useTeamStore()
const expenseAccountEip712Address = computed(
  () => teamStore.getContractAddressByType('ExpenseAccountEIP712') as Address
)
</script>
