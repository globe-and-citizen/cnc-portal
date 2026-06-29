<template>
  <div>
    <div class="grid items-stretch gap-5 lg:grid-cols-[1fr_1.1fr]">
      <!-- Gauge ring -->
      <div
        class="border-default bg-default flex flex-col items-center justify-center rounded-2xl border p-8 text-center shadow-sm"
      >
        <div
          class="flex h-[190px] w-[190px] items-center justify-center rounded-full"
          :style="ringStyle"
        >
          <div
            class="bg-default flex h-[152px] w-[152px] flex-col items-center justify-center rounded-full"
          >
            <div class="text-primary text-[38px] leading-none font-extrabold tracking-tight">
              {{ pct }}%
            </div>
            <div class="text-muted mt-1 text-[11px]">funded</div>
          </div>
        </div>
        <div class="mt-5.5 text-[22px] font-extrabold tracking-tight">
          {{ formatAmount(round.raised) }}
        </div>
        <div class="text-muted mt-0.5 text-sm">raised of {{ formatAmount(round.target) }}</div>
        <div class="text-primary mt-2.5 text-xs font-semibold">{{ remainingNote }}</div>
      </div>

      <!-- Stats + access -->
      <div class="flex flex-col gap-5">
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
          <div class="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
              class="h-full rounded-full"
              :class="lender.you ? 'bg-primary' : 'bg-primary/40'"
              :style="{ width: lender.share + '%' }"
            ></div>
          </div>
          <div class="min-w-[90px] text-right">
            <div class="text-sm font-bold">{{ formatAmount(lender.amount) }}</div>
            <div class="text-muted text-[11px]">{{ lender.share }}%</div>
          </div>
        </div>
      </div>
      <div v-else class="text-muted px-6 py-10 text-center text-sm">No lenders yet.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount, percentOf, roundInterest, roundTotalDue } from '@/utils'
import type { CreditRound } from '@/types'
import CreditAvatar from './CreditAvatar.vue'

const props = defineProps<{ round: CreditRound }>()

const pct = computed(() => percentOf(props.round.raised, props.round.target))
const ringStyle = computed(() => ({
  background: `conic-gradient(#00bf7a ${pct.value * 3.6}deg, #eef3f0 0deg)`
}))
const remainingNote = computed(() =>
  props.round.status === 'open'
    ? `${formatAmount(props.round.target - props.round.raised)} remaining`
    : 'Fully funded'
)

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
    value: formatAmount(roundTotalDue(props.round)),
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
