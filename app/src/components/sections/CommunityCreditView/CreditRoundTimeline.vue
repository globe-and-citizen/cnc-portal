<template>
  <div>
    <!-- Lifecycle -->
    <div class="border-default bg-default mb-5 rounded-2xl border p-7 shadow-sm">
      <div class="text-muted mb-5.5 text-sm font-semibold">Lifecycle</div>
      <div class="flex items-start">
        <div
          v-for="(step, i) in lifecycle"
          :key="step.label"
          class="relative flex flex-1 flex-col items-center text-center"
        >
          <!-- Connector to previous dot -->
          <span
            v-if="i > 0"
            class="absolute top-[19px] right-1/2 z-0 h-0.5 w-full"
            :class="i <= currentIndex ? 'bg-primary/40' : 'bg-default'"
          ></span>
          <span
            class="relative z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full border"
            :class="step.dotClass"
          >
            <UIcon :name="step.icon" class="size-4" />
          </span>
          <div class="mt-2.5 text-xs font-bold" :class="step.labelClass">{{ step.label }}</div>
          <div class="text-muted mt-0.5 text-[11px]">{{ step.date }}</div>
        </div>
      </div>
    </div>

    <div class="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
      <!-- Left: progress + schedule -->
      <div class="flex flex-col gap-5">
        <div class="border-default bg-default rounded-2xl border p-6 shadow-sm">
          <div class="flex items-baseline justify-between">
            <span class="text-muted text-sm font-medium">Funding progress</span>
            <span class="text-primary text-xs font-bold">{{ pct }}%</span>
          </div>
          <div class="mt-1.5 flex items-baseline gap-2">
            <span class="text-[28px] font-extrabold tracking-tight">{{
              formatAmount(round.raised)
            }}</span>
            <span class="text-muted text-sm">/ {{ formatAmount(round.target) }}</span>
          </div>
          <UProgress :model-value="pct" :max="100" size="md" class="mt-3.5" />
        </div>

        <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
          <div class="border-default border-b px-6 py-4">
            <span class="text-base font-semibold">Repayment schedule</span>
          </div>
          <div class="px-6 pt-2 pb-4">
            <div
              v-for="(item, i) in schedule"
              :key="item.title"
              class="flex items-center gap-3.5 py-3.5"
              :class="{ 'border-default/60 border-b': i < schedule.length - 1 }"
            >
              <span
                class="inline-flex items-center justify-center rounded-xl p-2"
                :class="item.chipClass"
              >
                <UIcon :name="item.icon" class="size-4" />
              </span>
              <div class="flex-1">
                <div class="text-sm font-bold">{{ item.title }}</div>
                <div class="text-muted text-[11px]">{{ item.date }}</div>
              </div>
              <span class="text-sm font-bold" :class="item.amountClass">{{ item.amount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: total due + lenders -->
      <div class="flex flex-col gap-5">
        <div
          class="border-primary/20 from-primary/5 to-default rounded-2xl border bg-gradient-to-br p-6 shadow-sm"
        >
          <div class="text-primary text-sm font-semibold">Total due at maturity</div>
          <div class="mt-2 text-3xl font-extrabold tracking-tight">
            {{ formatAmount(totalDue) }}
          </div>
          <div class="text-muted mt-1 text-xs">
            {{ formatAmount(round.raised) }} principal + {{ formatAmount(interest) }} interest
          </div>
        </div>

        <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
          <div class="border-default flex items-center justify-between border-b px-6 py-4">
            <span class="text-base font-semibold">Lenders</span>
            <UBadge color="primary" variant="subtle" :label="`${round.lenders.length} lenders`" />
          </div>
          <div v-if="round.lenders.length" class="px-3.5 pt-1.5 pb-3">
            <div
              v-for="lender in lenders"
              :key="lender.addr"
              class="hover:bg-muted flex items-center gap-2.5 rounded-xl px-2 py-2.5 transition-colors"
            >
              <CreditAvatar :name="lender.name" :gradient="lender.gradient" :size="30" />
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold">{{ lender.name }}</div>
                <div class="text-muted text-[11px]">{{ lender.share }}% share</div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span :class="lender.refunded ? 'text-muted text-sm' : 'text-sm font-bold'">{{
                  formatAmount(lender.amount)
                }}</span>
                <UBadge
                  v-if="lender.refunded"
                  color="neutral"
                  variant="subtle"
                  label="Refunded"
                  size="sm"
                />
              </div>
            </div>
          </div>
          <div v-else class="text-muted px-6 py-10 text-center text-sm">No lenders yet.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount, percentOf, roundInterest, roundTotalDue } from '@/utils'
import type { CreditRound, RoundStatus } from '@/types'
import CreditAvatar from './CreditAvatar.vue'

const props = defineProps<{ round: CreditRound }>()

const LIFE_ORDER: RoundStatus[] = ['open', 'stalled', 'funded', 'active', 'repaid']
// 'refunded' isn't a further step down the happy path — it's a divergent outcome once a
// round misses its deadline, so it has no slot in LIFE_ORDER. Anchor it at the "Funded"
// dot's position so the Draft/Open steps still render as done instead of every dot
// looking unstarted (LIFE_ORDER.indexOf would otherwise return -1). 'overdue' is just
// 'funded'/'active' with a maturity-passed badge on top (see offerStateToRoundStatus) —
// same "In repayment" position as 'active'.
const currentIndex = computed(() =>
  props.round.status === 'refunded'
    ? 2
    : props.round.status === 'overdue'
      ? LIFE_ORDER.indexOf('active')
      : LIFE_ORDER.indexOf(props.round.status)
)
const isRefunded = computed(() => props.round.status === 'refunded')

const pct = computed(() => percentOf(props.round.raised, props.round.target))
const interest = computed(() => roundInterest(props.round))
const totalDue = computed(() => roundTotalDue(props.round))

const lifecycle = computed(() => {
  const r = props.round
  const refunded = isRefunded.value
  const meta = [
    { label: 'Draft', icon: 'heroicons:pencil-square', date: r.opened ? 'created' : '—' },
    { label: 'Open', icon: 'heroicons:lock-open', date: r.opened || '—' },
    {
      label: refunded ? 'Refunded' : 'Funded',
      icon: refunded ? 'heroicons:arrow-uturn-left' : 'heroicons:check-circle',
      date:
        r.status === 'open' || r.status === 'stalled'
          ? 'pending'
          : refunded
            ? 'principal returned'
            : r.deadline || '—'
    },
    {
      label: 'In repayment',
      icon: 'heroicons:clock',
      date:
        r.maturity && r.status !== 'open' && r.status !== 'stalled' && !refunded
          ? `until ${r.maturity}`
          : '—'
    },
    {
      label: 'Repaid',
      icon: 'heroicons:banknotes',
      date: refunded ? '—' : r.repaidOn || r.maturity || '—'
    }
  ]
  return meta.map((m, i) => {
    const done = i < currentIndex.value
    const current = i === currentIndex.value
    return {
      ...m,
      labelClass: current ? 'text-primary' : done ? 'text-default' : 'text-dimmed',
      dotClass: current
        ? 'border-transparent bg-primary text-white'
        : done
          ? 'border-default bg-primary/15 text-primary'
          : 'border-default bg-muted text-dimmed'
    }
  })
})

const schedule = computed(() => {
  const r = props.round
  const fundingReceived = {
    title: 'Funding received',
    date: r.status === 'open' ? 'in progress' : r.opened || '—',
    amount: formatAmount(r.raised),
    icon: 'heroicons:arrow-down-left',
    chipClass: 'bg-success/12 text-success',
    amountClass: 'text-success'
  }
  if (isRefunded.value) {
    return [
      fundingReceived,
      {
        title: 'Principal refunded',
        date: 'returned to lenders',
        amount: formatAmount(r.raised),
        icon: 'heroicons:arrow-uturn-left',
        chipClass: 'bg-neutral/12 text-neutral',
        amountClass: 'text-default'
      }
    ]
  }
  return [
    fundingReceived,
    {
      title: 'Repayment (principal + interest)',
      date: `matures ${r.maturity || '—'}`,
      amount: formatAmount(totalDue.value),
      icon: 'heroicons:arrow-up-right',
      chipClass: 'bg-warning/15 text-warning',
      amountClass: 'text-default'
    }
  ]
})

const lenders = computed(() =>
  props.round.lenders.map((lender) => ({
    ...lender,
    share: percentOf(lender.amount, props.round.raised)
  }))
)
</script>
