<template>
  <div
    class="border-primary/20 from-primary/5 to-default rounded-2xl border bg-gradient-to-br p-6 shadow-sm"
  >
    <div class="text-primary text-sm font-semibold">Repayment at maturity</div>
    <div class="mt-3.5 flex flex-col gap-2.5">
      <div class="flex justify-between text-sm">
        <span class="text-muted">Principal</span>
        <span class="font-semibold">{{ formatAmount(round.raised) }}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-muted">Interest · {{ round.rate }}%</span>
        <span class="text-primary font-semibold">+ {{ formatAmount(interest) }}</span>
      </div>
      <div
        class="border-primary/20 mt-0.5 flex items-baseline justify-between border-t border-dashed pt-3"
      >
        <span class="text-sm font-semibold">Total due</span>
        <span class="text-[22px] font-extrabold tracking-tight">{{ formatAmount(total) }}</span>
      </div>
      <div class="text-muted text-[11px]">
        Matures {{ round.maturity || '—' }} · {{ round.termLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount, roundInterest, roundTotalDue } from '@/utils'
import type { CreditRound } from '@/types'

const props = defineProps<{ round: CreditRound }>()

const interest = computed(() => roundInterest(props.round))
const total = computed(() => roundTotalDue(props.round))
</script>
