<template>
  <div class="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
    <!-- Left column -->
    <div class="flex flex-col gap-5">
      <!-- Funding figure -->
      <div class="border-default bg-default rounded-2xl border p-6 shadow-sm">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div class="text-muted text-sm font-medium">Raised so far</div>
            <div class="mt-1 text-[40px] leading-none font-extrabold tracking-tight">
              {{ formatAmount(round.raised) }}
            </div>
            <div class="text-muted mt-1 text-sm">of {{ formatAmount(round.target) }} target</div>
          </div>
          <div class="text-right">
            <div class="text-primary text-3xl font-extrabold tracking-tight">{{ pct }}%</div>
            <div class="text-muted text-xs">{{ remainingNote }}</div>
          </div>
        </div>
        <UProgress :model-value="pct" :max="100" size="md" class="mt-4.5" />
        <div class="text-muted mt-2.5 flex justify-between text-[11px]">
          <span>Subscription closes {{ round.deadline || '—' }}</span>
          <span>Matures {{ round.maturity || '—' }} · {{ round.period }} days</span>
        </div>
      </div>

      <!-- Lenders -->
      <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
        <div class="border-default flex items-center justify-between border-b px-6 py-4">
          <span class="text-base font-semibold">Lenders</span>
          <UBadge color="primary" variant="subtle" :label="`${round.lenders.length} lenders`" />
        </div>

        <UTable
          :data="lenders"
          :columns="lenderColumns"
          :meta="{ class: { tr: (row) => (row.original.you ? 'bg-primary/5' : '') } }"
        >
          <template #lender-cell="{ row }">
            <div class="flex items-center gap-2.5">
              <CreditAvatar
                :name="row.original.name"
                :gradient="row.original.gradient"
                :size="30"
              />
              <span class="font-semibold">{{ row.original.name }}</span>
              <UBadge
                v-if="row.original.you"
                color="primary"
                variant="subtle"
                size="sm"
                label="You"
              />
            </div>
          </template>
          <template #address-cell="{ row }">
            <span class="text-muted font-mono text-xs">{{ row.original.addr }}</span>
          </template>
          <template #amount-cell="{ row }">
            <span class="font-bold">{{ formatAmount(row.original.amount) }}</span>
          </template>
          <template #expected-cell="{ row }">
            <span class="text-primary font-semibold">{{
              formatAmount(row.original.expected)
            }}</span>
          </template>
          <template #paid-cell="{ row }">
            <span class="font-semibold">{{ formatAmount(row.original.paid) }}</span>
          </template>
          <template #share-cell="{ row }">
            <span class="text-muted">{{ row.original.share }}%</span>
          </template>
          <template #empty>
            <div class="text-muted px-6 py-10 text-center">
              <UIcon name="heroicons:users" class="text-dimmed size-7" />
              <div class="text-default mt-2 text-sm font-semibold">No lenders yet</div>
              <div class="mt-0.5 text-xs">Be the first to back this round.</div>
            </div>
          </template>
        </UTable>
      </div>
    </div>

    <!-- Right column -->
    <div class="flex flex-col gap-5">
      <CreditConditionsCard :round="round" />
      <CreditRepaymentCard :round="round" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount, percentOf, reachedFundingTarget } from '@/utils'
import type { CreditRound } from '@/types'
import CreditAvatar from './CreditAvatar.vue'
import CreditConditionsCard from './CreditConditionsCard.vue'
import CreditRepaymentCard from './CreditRepaymentCard.vue'

const props = defineProps<{ round: CreditRound }>()

const pct = computed(() => percentOf(props.round.raised, props.round.target))
const remainingNote = computed(() => {
  if (props.round.status === 'open' || props.round.status === 'stalled') {
    return `${formatAmount(props.round.target - props.round.raised)} remaining`
  }
  return reachedFundingTarget(props.round) ? 'Fully funded' : 'Accepted with partial funding'
})
const lenders = computed(() =>
  props.round.lenders.map((lender) => ({
    ...lender,
    share: percentOf(lender.amount, props.round.raised)
  }))
)

const rightAlign = { class: { th: 'text-right', td: 'text-right' } }
const lenderColumns = [
  { accessorKey: 'lender', header: 'Lender' },
  { accessorKey: 'address', header: 'Address' },
  { accessorKey: 'amount', header: 'Amount', meta: rightAlign },
  { accessorKey: 'expected', header: 'Expected return', meta: rightAlign },
  { accessorKey: 'paid', header: 'Paid so far', meta: rightAlign },
  { accessorKey: 'share', header: 'Share', meta: rightAlign }
]
</script>
