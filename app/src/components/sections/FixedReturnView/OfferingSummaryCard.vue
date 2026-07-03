<template>
  <div class="sticky top-6 flex flex-col gap-4">
    <!-- Dark return card -->
    <UCard class="bg-[#0f3d2e] text-white shadow-lg" :ui="{ body: 'p-6' }">
      <div class="mb-1 text-xs font-bold tracking-widest text-[#7fd9b6] uppercase">
        Repayment at maturity
      </div>
      <div class="mb-2 truncate text-sm font-semibold text-[#a9c9bd]">{{ title }}</div>
      <div class="my-1 text-4xl font-extrabold tracking-tight">{{ moneyShort(totalReturn) }}</div>
      <div class="text-sm text-[#a9c9bd]">
        Principal {{ moneyShort(principal) }} + interest {{ moneyShort(totalInterest) }}
      </div>
      <div class="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/20">
        <div class="bg-[#154937] px-3 py-3">
          <div class="text-xs text-[#8fc3ad]">Rate</div>
          <div class="mt-0.5 text-base font-bold">{{ rate.toFixed(1) }}%</div>
        </div>
        <div class="bg-[#154937] px-3 py-3">
          <div class="text-xs text-[#8fc3ad]">Interest</div>
          <div class="mt-0.5 text-base font-bold">{{ moneyShort(totalInterest) }}</div>
        </div>
        <div class="bg-[#154937] px-3 py-3">
          <div class="text-xs text-[#8fc3ad]">Repayment</div>
          <div class="mt-0.5 text-base font-bold">Bullet</div>
        </div>
      </div>
    </UCard>

    <!-- Terms at a glance -->
    <UCard>
      <template #header>
        <div class="text-sm font-extrabold text-[#0f3d2e]">Terms at a glance</div>
      </template>
      <div class="flex flex-col gap-3">
        <div class="flex justify-between text-sm">
          <span class="text-muted">Term</span>
          <span class="font-bold">{{ termLabel }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted">Deadline</span>
          <span class="font-bold">{{ deadlineFmt }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted">Maturity</span>
          <span class="font-bold">{{ maturityFmt }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">Access</span>
          <span class="flex items-center gap-1.5 font-bold">
            <span class="h-2 w-2 rounded-full" :style="{ background: accessDot }"></span>
            {{ accessLabel }}
          </span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted">Loan amount</span>
          <span class="font-bold">{{ limitsLabel }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">Collateral</span>
          <span class="flex items-center gap-1.5 font-bold">
            <span class="h-2 w-2 rounded-full bg-[#8a99ab]"></span>
            None
          </span>
        </div>
      </div>
    </UCard>

    <!-- Info note -->
    <UAlert
      color="info"
      variant="soft"
      icon="heroicons:information-circle"
      description="Once published, this offering appears in the Lender marketplace. Eligible lenders apply with an amount and submit."
    />
  </div>
</template>

<script setup lang="ts">
import { moneyShort } from '@/utils'

defineProps<{
  title: string
  principal: number
  rate: number
  termLabel: string
  totalInterest: number
  totalReturn: number
  deadlineFmt: string
  maturityFmt: string
  accessLabel: string
  accessDot: string
  limitsLabel: string
}>()
</script>
