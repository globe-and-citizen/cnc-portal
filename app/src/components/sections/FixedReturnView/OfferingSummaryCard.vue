<template>
  <div class="flex flex-col gap-4 sticky top-6">
    <!-- Dark return card -->
    <div class="bg-[#0f3d2e] rounded-2xl p-6 text-white shadow-lg">
      <div class="text-xs font-bold tracking-widest text-[#7fd9b6] uppercase mb-1">Repayment at maturity</div>
      <div class="text-sm font-semibold text-[#a9c9bd] truncate mb-2">{{ title }}</div>
      <div class="text-4xl font-extrabold tracking-tight my-1">{{ moneyShort(totalReturn) }}</div>
      <div class="text-sm text-[#a9c9bd]">
        Principal {{ moneyShort(principal) }} + interest {{ moneyShort(totalInterest) }}
      </div>
      <div class="grid grid-cols-3 gap-px mt-4 bg-white/20 rounded-xl overflow-hidden">
        <div class="bg-[#154937] px-3 py-3">
          <div class="text-xs text-[#8fc3ad]">Rate</div>
          <div class="text-base font-bold mt-0.5">{{ rate.toFixed(1) }}%</div>
        </div>
        <div class="bg-[#154937] px-3 py-3">
          <div class="text-xs text-[#8fc3ad]">Per year</div>
          <div class="text-base font-bold mt-0.5">{{ moneyShort(annualInterest) }}</div>
        </div>
        <div class="bg-[#154937] px-3 py-3">
          <div class="text-xs text-[#8fc3ad]">Repayment</div>
          <div class="text-base font-bold mt-0.5">Bullet</div>
        </div>
      </div>
    </div>

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
          <span class="text-muted">Start</span>
          <span class="font-bold">{{ startFmt }}</span>
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
import { moneyShort } from './offeringForm'

defineProps<{
  title: string
  principal: number
  rate: number
  termLabel: string
  annualInterest: number
  totalInterest: number
  totalReturn: number
  startFmt: string
  maturityFmt: string
  accessLabel: string
  accessDot: string
  limitsLabel: string
}>()
</script>
