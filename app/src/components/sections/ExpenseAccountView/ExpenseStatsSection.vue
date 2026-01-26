<template>
  <div class="flex gap-6">
    <ExpenseAccountBalance />
    <ExpenseMonthSpent />
    <ExpenseAccountTotalApproved />
  </div>

  <div class="flex sm:flex-row justify-end sm:items-start">
    <div class="flex flex-wrap gap-2 sm:gap-4" data-test="expense-account-address">
      <span class="text-sm">Expense Account Address </span>
      <AddressToolTip :address="expenseAccountEip712Address ?? ''" class="text-xs" />
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

//#region  Composables
const teamStore = useTeamStore()
const expenseAccountEip712Address = computed(
  () => teamStore.getContractAddressByType('ExpenseAccountEIP712') as Address
)
</script>
