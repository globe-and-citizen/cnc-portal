<template>
  <div class="flex gap-6">
    <ExpenseAccountBalance />
    <OverviewCard title="10.2K" subtitle="Month Spent" variant="warning" :card-icon="cartIcon">
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 26.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
    <OverviewCard title="47.9K" subtitle="Total Approved" variant="info" :card-icon="personIcon"
      ><div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 12.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div></OverviewCard
    >
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
import OverviewCard from '@/components/OverviewCard.vue'
import cartIcon from '@/assets/cart.svg'
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import ExpenseAccountBalance from '@/components/sections/ExpenseAccountView/ExpenseAccountBalance.vue'

//#region  Composables
const teamStore = useTeamStore()
const expenseAccountEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'ExpenseAccountEIP712'
    )?.address as Address
)
</script>
