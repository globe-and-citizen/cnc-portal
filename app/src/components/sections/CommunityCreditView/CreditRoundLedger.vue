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
        <div class="bg-muted mt-4.5 h-3.5 overflow-hidden rounded-full">
          <div
            class="bg-primary h-full rounded-full transition-all"
            :style="{ width: pct + '%' }"
          ></div>
        </div>
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

        <table v-if="round.lenders.length" class="w-full border-collapse">
          <thead>
            <tr class="bg-muted text-muted text-left text-xs font-semibold">
              <th class="px-4 py-3">Lender</th>
              <th class="px-4 py-3">Address</th>
              <th class="px-4 py-3 text-right">Amount</th>
              <th class="px-4 py-3 text-right">Share</th>
              <th class="px-4 py-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lender in lenders"
              :key="lender.addr"
              class="border-default/60 border-t"
              :class="{ 'bg-primary/5': lender.you }"
            >
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-2.5">
                  <CreditAvatar :name="lender.name" :gradient="lender.gradient" :size="30" />
                  <span class="font-semibold">{{ lender.name }}</span>
                  <UBadge
                    v-if="lender.you"
                    color="primary"
                    variant="subtle"
                    size="sm"
                    label="You"
                  />
                </div>
              </td>
              <td class="px-4 py-3.5">
                <span class="text-muted font-mono text-xs">{{ lender.addr }}</span>
              </td>
              <td class="px-4 py-3.5 text-right font-bold">{{ formatAmount(lender.amount) }}</td>
              <td class="text-muted px-4 py-3.5 text-right">{{ lender.share }}%</td>
              <td class="text-muted px-4 py-3.5 text-right">{{ lender.date }}</td>
            </tr>
          </tbody>
        </table>

        <div v-else class="text-muted px-6 py-10 text-center">
          <UIcon name="heroicons:users" class="text-dimmed size-7" />
          <div class="text-default mt-2 text-sm font-semibold">No lenders yet</div>
          <div class="mt-0.5 text-xs">Be the first to back this round.</div>
        </div>
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
import { formatAmount, percentOf } from '@/utils'
import type { CreditRound } from '@/types'
import CreditAvatar from './CreditAvatar.vue'
import CreditConditionsCard from './CreditConditionsCard.vue'
import CreditRepaymentCard from './CreditRepaymentCard.vue'

const props = defineProps<{ round: CreditRound }>()

const pct = computed(() => percentOf(props.round.raised, props.round.target))
const remainingNote = computed(() =>
  props.round.status === 'open'
    ? `${formatAmount(props.round.target - props.round.raised)} remaining`
    : 'Fully funded'
)
const lenders = computed(() =>
  props.round.lenders.map((lender) => ({
    ...lender,
    share: percentOf(lender.amount, props.round.raised)
  }))
)
</script>
