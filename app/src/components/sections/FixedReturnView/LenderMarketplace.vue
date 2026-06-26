<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="text-xl font-extrabold tracking-tight text-[#0f3d2e]">Available offerings</div>
        <div class="mt-1 text-sm text-[#7d8e84]">
          Fixed-return notes you're eligible to fund. Apply with an amount and submit.
        </div>
      </div>
      <div class="flex items-center gap-2 text-sm text-[#7d8e84]">
        <span class="bg-primary h-2 w-2 rounded-full"></span>
        {{ offerings.length }} open
      </div>
    </div>

    <!-- Offering cards -->
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
      <div
        v-for="o in offerings"
        :key="o.title"
        class="flex flex-col gap-4 rounded-2xl border border-[#e6efe9] bg-white p-5 shadow-sm transition-all hover:border-[#bfe3d2] hover:shadow-md"
      >
        <!-- Title + rate -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-2">
            <div class="text-base leading-tight font-extrabold text-[#0f3d2e]">{{ o.title }}</div>
            <span
              class="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold"
              :style="{ background: o.accessBg, color: o.accessColor }"
            >
              <span class="h-1.5 w-1.5 rounded-full" :style="{ background: o.accessDot }"></span>
              {{ o.accessLabel }}
            </span>
          </div>
          <div class="flex-none text-right">
            <div class="text-2xl leading-none font-extrabold tracking-tight text-[#00a86c]">
              {{ o.rate }}%
            </div>
            <div class="mt-0.5 text-xs font-semibold text-[#9aaba2]">fixed / yr</div>
          </div>
        </div>

        <!-- Info tiles -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Term</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">{{ o.term }} mo</div>
          </div>
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Repayment</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">Bullet</div>
          </div>
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Loan amount</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">{{ o.limitsLabel }}</div>
          </div>
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Collateral</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">None</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div>
          <div class="mb-1.5 flex justify-between text-xs font-semibold">
            <span class="text-[#7d8e84]">Raised {{ moneyShort(o.raised) }}</span>
            <span class="text-[#9aaba2]">of {{ moneyShort(o.target) }} · {{ o.pct }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-[#eef3f0]">
            <div class="bg-primary h-full rounded-full" :style="{ width: o.pct + '%' }"></div>
          </div>
        </div>

        <!-- Button -->
        <button
          :disabled="!o.allowed"
          class="h-11 rounded-xl border-none text-sm font-bold transition-all"
          :style="
            o.allowed
              ? 'background:#00bf7a;color:#fff;cursor:pointer;box-shadow:0 4px 11px rgba(0,191,122,.26)'
              : 'background:#f4f8f6;color:#9aaba2;cursor:not-allowed;border:1px solid #e0eae5'
          "
          @click="o.allowed && openApply(o)"
        >
          {{ o.allowed ? 'Apply to lend' : 'Whitelist only' }}
        </button>
      </div>
    </div>

    <!-- Apply modal -->
    <ApplyOfferingModal
      v-if="selected"
      :title="selected.title"
      :rate="selected.rate"
      :term="selected.term"
      :amount="applyAmount"
      :interest="applyInterest"
      :total="applyTotal"
      :amount-locked="amountLocked"
      :limits-hint="limitsHint"
      :error="amountError"
      @close="closeApply"
      @submit="submitApplication"
      @update:amount="applyAmount = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import ApplyOfferingModal from './ApplyOfferingModal.vue'
import { expectedReturn, moneyShort, percentOf } from '@/utils'
import type { LenderOffering } from '@/types'

const rawOfferings = [
  {
    title: 'Riverside Expansion Note',
    rate: 9,
    term: 12,
    access: 'general' as const,
    mode: 'range' as const,
    min: 5000,
    max: 50000,
    raised: 320000,
    target: 500000
  },
  {
    title: 'Mill Street Solar Array',
    rate: 8.5,
    term: 18,
    access: 'whitelist' as const,
    whitelisted: true,
    myAllocation: 30000,
    mode: 'fixed' as const,
    fixed: 25000,
    raised: 150000,
    target: 300000
  },
  {
    title: 'Harbor Logistics Facility',
    rate: 10,
    term: 24,
    access: 'general' as const,
    mode: 'range' as const,
    min: 10000,
    max: 100000,
    raised: 80000,
    target: 750000
  },
  {
    title: 'Downtown Retail Refit',
    rate: 8,
    term: 9,
    access: 'whitelist' as const,
    whitelisted: false,
    mode: 'fixed' as const,
    fixed: 15000,
    raised: 90000,
    target: 120000
  }
]

const offerings = computed<LenderOffering[]>(() =>
  rawOfferings.map((o) => {
    const allowed = o.access === 'general' || !!o.whitelisted
    const pct = percentOf(o.raised, o.target)
    const limitsLabel =
      'myAllocation' in o && o.myAllocation != null
        ? moneyShort(o.myAllocation) + ' allocation'
        : o.mode === 'fixed' && o.fixed != null
          ? moneyShort(o.fixed) + ' fixed'
          : moneyShort(o.min ?? 0) + ' – ' + moneyShort(o.max ?? 0)
    const access =
      o.access === 'whitelist'
        ? {
            accessLabel: 'Whitelist',
            accessBg: '#ebf0ff',
            accessColor: '#2b50c8',
            accessDot: '#3366ff'
          }
        : {
            accessLabel: 'Open to all',
            accessBg: '#e6f8f1',
            accessColor: '#0a7a52',
            accessDot: '#00bf7a'
          }
    return { ...o, allowed, pct, limitsLabel, ...access }
  })
)

const toast = useToast()

const selected = ref<LenderOffering | null>(null)
const applyAmount = ref(0)

const amountLocked = computed(() => {
  if (!selected.value) return false
  return (
    ('myAllocation' in selected.value && selected.value.myAllocation != null) ||
    selected.value.mode === 'fixed'
  )
})

const applyTotal = computed(() => {
  if (!selected.value) return 0
  return expectedReturn(applyAmount.value, selected.value.rate)
})
const applyInterest = computed(() => applyTotal.value - applyAmount.value)

const amountError = computed(() => {
  if (!selected.value || amountLocked.value) return ''
  const o = selected.value
  if (o.mode === 'range' && o.min != null && applyAmount.value < o.min)
    return 'Minimum loan amount is ' + moneyShort(o.min) + '.'
  if (o.mode === 'range' && o.max != null && applyAmount.value > o.max)
    return 'Maximum loan amount is ' + moneyShort(o.max) + '.'
  return ''
})

const limitsHint = computed(() => {
  if (!selected.value) return ''
  const o = selected.value
  if ('myAllocation' in o && o.myAllocation != null)
    return 'Your allocation of ' + moneyShort(o.myAllocation) + ' was set by the project admin.'
  if (o.mode === 'fixed' && o.fixed != null)
    return 'Fixed loan amount of ' + moneyShort(o.fixed) + ' for this offering.'
  return 'Allowed range: ' + moneyShort(o.min ?? 0) + ' – ' + moneyShort(o.max ?? 0) + '.'
})

function openApply(o: LenderOffering) {
  const start =
    'myAllocation' in o && o.myAllocation != null
      ? o.myAllocation
      : o.mode === 'fixed' && o.fixed != null
        ? o.fixed
        : (o.min ?? 0)
  selected.value = o
  applyAmount.value = start
}

function closeApply() {
  selected.value = null
}

function submitApplication() {
  if (!selected.value) return
  toast.add({
    title: `You applied to lend ${moneyShort(applyAmount.value)} to ${selected.value.title}`,
    color: 'success'
  })
  closeApply()
}
</script>
