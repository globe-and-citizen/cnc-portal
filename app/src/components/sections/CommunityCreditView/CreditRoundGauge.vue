<template>
  <div>
    <div class="flex flex-col gap-5">
      <!-- Gauge rings: funding progress and repayment progress, separate cards side by side -->
      <div class="grid gap-5 lg:grid-cols-2">
        <div
          v-for="gauge in gauges"
          :key="gauge.key"
          class="border-default bg-default flex flex-col items-center justify-center rounded-2xl border p-8 text-center shadow-sm"
        >
          <div
            class="flex h-[190px] w-[190px] items-center justify-center rounded-full"
            :style="gauge.ringStyle"
          >
            <div
              class="bg-default flex h-[152px] w-[152px] flex-col items-center justify-center rounded-full"
            >
              <div class="text-primary text-[38px] leading-none font-extrabold tracking-tight">
                {{ gauge.pct }}%
              </div>
              <div class="text-muted mt-1 text-[11px]">{{ gauge.label }}</div>
            </div>
          </div>
          <div class="mt-5.5 text-[22px] font-extrabold tracking-tight">{{ gauge.amount }}</div>
          <div class="text-muted mt-0.5 text-sm">{{ gauge.totalNote }}</div>
          <div v-if="gauge.remainingNote" class="text-primary mt-2.5 text-xs font-semibold">
            {{ gauge.remainingNote }}
          </div>
        </div>
      </div>

      <!-- Stats + access -->
      <div class="grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div class="grid grid-cols-2 gap-3.5">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="border-default bg-default rounded-2xl border p-4 shadow-sm"
          >
            <div class="flex items-center gap-2">
              <span
                class="bg-primary/10 text-primary inline-flex items-center justify-center rounded-xl p-1.5"
              >
                <UIcon :name="stat.icon" class="size-3.5" />
              </span>
              <span class="text-muted text-[11px] font-semibold">{{ stat.label }}</span>
            </div>
            <div class="mt-2.5 text-[22px] font-extrabold tracking-tight">{{ stat.value }}</div>
            <div class="text-muted mt-0.5 text-[11px]">{{ stat.sub }}</div>
          </div>
        </div>

        <div
          class="border-default bg-default flex items-center gap-3.5 rounded-2xl border p-5 shadow-sm"
        >
          <span
            class="inline-flex items-center justify-center rounded-xl p-2.5"
            :class="access.chipClass"
          >
            <UIcon :name="access.icon" class="size-4.5" />
          </span>
          <div class="flex-1">
            <div class="text-sm font-bold">{{ access.title }}</div>
            <div class="text-muted mt-0.5 text-xs">{{ access.desc }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lenders -->
    <div class="border-default bg-default mt-5 overflow-hidden rounded-2xl border shadow-sm">
      <div class="border-default flex items-center justify-between border-b px-6 py-4">
        <span class="text-base font-semibold">Lenders</span>
        <UBadge color="primary" variant="subtle" :label="`${round.lenders.length} lenders`" />
      </div>
      <div v-if="round.lenders.length" class="px-6 pt-2 pb-4">
        <div
          v-for="lender in lenders"
          :key="lender.addr"
          class="hover:bg-muted flex items-center gap-3.5 rounded-xl p-3 transition-colors"
        >
          <CreditAvatar :name="lender.name" :gradient="lender.gradient" :size="34" />
          <div class="min-w-[120px]">
            <div class="text-sm font-semibold">{{ lender.name }}</div>
            <div class="text-muted font-mono text-[11px]">{{ lender.addr }}</div>
          </div>
          <UProgress
            :model-value="lender.share"
            :max="100"
            size="sm"
            :color="lender.you ? 'primary' : 'neutral'"
            class="flex-1"
          />
          <div class="min-w-[90px] text-right">
            <div :class="lender.refunded ? 'text-muted text-sm' : 'text-sm font-bold'">
              {{ formatAmount(lender.amount) }}
            </div>
            <UBadge
              v-if="lender.refunded"
              color="neutral"
              variant="subtle"
              label="Refunded"
              size="sm"
            />
            <div v-else class="text-muted text-[11px]">{{ lender.share }}%</div>
          </div>
        </div>
      </div>
      <div v-else class="text-muted px-6 py-10 text-center text-sm">No lenders yet.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  formatAmount,
  percentOf,
  reachedFundingTarget,
  roundInterest,
  roundTotalDue
} from '@/utils'
import type { CreditRound } from '@/types'
import CreditAvatar from './CreditAvatar.vue'

const props = defineProps<{ round: CreditRound }>()

const pct = computed(() => percentOf(props.round.raised, props.round.target))
const ringStyle = computed(() => ({
  background: `conic-gradient(#00bf7a ${pct.value * 3.6}deg, #eef3f0 0deg)`
}))
const remainingNote = computed(() => {
  if (props.round.status === 'open' || props.round.status === 'stalled') {
    return `${formatAmount(props.round.target - props.round.raised)} remaining`
  }
  if (props.round.status === 'refunded') {
    return 'Refunded — principal returned to lenders'
  }
  return reachedFundingTarget(props.round) ? 'Fully funded' : 'Accepted with partial funding'
})

// State of repayment — how much of principal + interest has actually been paid back,
// mirroring Issue Note's OfferingDetail "Repayment progress" gauge.
const totalDue = computed(() => roundTotalDue(props.round))
const repaymentPct = computed(() => percentOf(props.round.totalRepaid, totalDue.value))
const repaymentRingStyle = computed(() => ({
  background: `conic-gradient(#00bf7a ${repaymentPct.value * 3.6}deg, #eef3f0 0deg)`
}))

const gauges = computed(() => [
  {
    key: 'funding',
    pct: pct.value,
    ringStyle: ringStyle.value,
    label: 'funded',
    amount: formatAmount(props.round.raised),
    totalNote: `raised of ${formatAmount(props.round.target)}`,
    remainingNote: remainingNote.value
  },
  {
    key: 'repayment',
    pct: repaymentPct.value,
    ringStyle: repaymentRingStyle.value,
    label: 'repaid',
    amount: formatAmount(props.round.totalRepaid),
    totalNote: `repaid of ${formatAmount(totalDue.value)}`,
    remainingNote:
      totalDue.value > props.round.totalRepaid
        ? `${formatAmount(totalDue.value - props.round.totalRepaid)} remaining`
        : undefined
  }
])

const stats = computed(() => [
  {
    icon: 'heroicons:receipt-percent',
    label: 'Interest due',
    value: formatAmount(roundInterest(props.round)),
    sub: `at ${props.round.rate}% fixed`
  },
  {
    icon: 'heroicons:flag',
    label: 'Total at maturity',
    value: formatAmount(totalDue.value),
    sub: `matures ${props.round.maturity || '—'}`
  },
  {
    icon: 'heroicons:clock',
    label: 'Term',
    value: `${props.round.period} days`,
    sub: 'single repayment'
  },
  {
    icon: 'heroicons:calendar-days',
    label: 'Closes',
    value: props.round.deadline || '—',
    sub: 'subscription deadline'
  }
])

const access = computed(() => {
  const restricted = props.round.restricted
  const capNote = props.round.cap ? ` · capped at ${formatAmount(props.round.cap)} each` : ''
  return {
    icon: restricted ? 'heroicons:lock-closed' : 'heroicons:globe-alt',
    chipClass: restricted ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary',
    title: restricted ? 'Restricted round' : 'Open to all members',
    desc:
      (restricted ? 'Only whitelisted members can lend' : 'Any member can lend any amount') +
      capNote
  }
})

const lenders = computed(() =>
  props.round.lenders.map((lender) => ({
    ...lender,
    share: percentOf(lender.amount, props.round.raised)
  }))
)
</script>
