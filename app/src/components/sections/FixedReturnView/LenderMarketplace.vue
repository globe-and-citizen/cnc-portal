<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div class="text-xl font-extrabold text-[#0f3d2e] tracking-tight">Available offerings</div>
        <div class="text-sm text-[#7d8e84] mt-1">Fixed-return notes you're eligible to fund. Apply with an amount and submit.</div>
      </div>
      <div class="text-sm text-[#7d8e84] flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-primary"></span>
        {{ offerings.length }} open
      </div>
    </div>

    <!-- Offering cards -->
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
      <div
        v-for="o in offerings"
        :key="o.title"
        class="bg-white border border-[#e6efe9] rounded-2xl p-5 flex flex-col gap-4 shadow-sm transition-all hover:border-[#bfe3d2] hover:shadow-md"
      >
        <!-- Title + rate -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-2">
            <div class="text-base font-extrabold text-[#0f3d2e] leading-tight">{{ o.title }}</div>
            <span
              class="self-start inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
              :style="{ background: o.accessBg, color: o.accessColor }"
            >
              <span class="w-1.5 h-1.5 rounded-full" :style="{ background: o.accessDot }"></span>
              {{ o.accessLabel }}
            </span>
          </div>
          <div class="text-right flex-none">
            <div class="text-2xl font-extrabold text-[#00a86c] tracking-tight leading-none">{{ o.rate }}%</div>
            <div class="text-xs text-[#9aaba2] font-semibold mt-0.5">fixed / yr</div>
          </div>
        </div>

        <!-- Info tiles -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="bg-[#f7faf8] rounded-xl px-3 py-2.5">
            <div class="text-xs text-[#9aaba2] font-semibold">Term</div>
            <div class="text-sm font-bold text-[#0f3d2e] mt-0.5">{{ o.term }} mo</div>
          </div>
          <div class="bg-[#f7faf8] rounded-xl px-3 py-2.5">
            <div class="text-xs text-[#9aaba2] font-semibold">Repayment</div>
            <div class="text-sm font-bold text-[#0f3d2e] mt-0.5">Bullet</div>
          </div>
          <div class="bg-[#f7faf8] rounded-xl px-3 py-2.5">
            <div class="text-xs text-[#9aaba2] font-semibold">Loan amount</div>
            <div class="text-sm font-bold text-[#0f3d2e] mt-0.5">{{ o.limitsLabel }}</div>
          </div>
          <div class="bg-[#f7faf8] rounded-xl px-3 py-2.5">
            <div class="text-xs text-[#9aaba2] font-semibold">Collateral</div>
            <div class="text-sm font-bold text-[#0f3d2e] mt-0.5">None</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div>
          <div class="flex justify-between text-xs font-semibold mb-1.5">
            <span class="text-[#7d8e84]">Raised {{ moneyShort(o.raised) }}</span>
            <span class="text-[#9aaba2]">of {{ moneyShort(o.target) }} · {{ o.pct }}%</span>
          </div>
          <div class="h-2 rounded-full bg-[#eef3f0] overflow-hidden">
            <div class="h-full rounded-full bg-primary" :style="{ width: o.pct + '%' }"></div>
          </div>
        </div>

        <!-- Button -->
        <button
          :disabled="!o.allowed"
          class="h-11 rounded-xl text-sm font-bold border-none transition-all"
          :style="o.allowed
            ? 'background:#00bf7a;color:#fff;cursor:pointer;box-shadow:0 4px 11px rgba(0,191,122,.26)'
            : 'background:#f4f8f6;color:#9aaba2;cursor:not-allowed;border:1px solid #e0eae5'"
          @click="o.allowed && openApply(o)"
        >{{ o.allowed ? 'Apply to lend' : 'Whitelist only' }}</button>
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
      :is-done="applyDone"
      @close="closeApply"
      @submit="applyDone = true"
      @update:amount="applyAmount = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ApplyOfferingModal from './ApplyOfferingModal.vue'
import { moneyShort } from './offeringForm'

interface Offering {
  title: string
  rate: number
  term: number
  access: 'general' | 'whitelist'
  whitelisted?: boolean
  myAllocation?: number
  mode: 'range' | 'fixed'
  min?: number
  max?: number
  fixed?: number
  raised: number
  target: number
  allowed: boolean
  accessLabel: string
  accessBg: string
  accessColor: string
  accessDot: string
  limitsLabel: string
  pct: number
}

const rawOfferings = [
  { title: 'Riverside Expansion Note', rate: 9, term: 12, access: 'general' as const, mode: 'range' as const, min: 5000, max: 50000, raised: 320000, target: 500000 },
  { title: 'Mill Street Solar Array', rate: 8.5, term: 18, access: 'whitelist' as const, whitelisted: true, myAllocation: 30000, mode: 'fixed' as const, fixed: 25000, raised: 150000, target: 300000 },
  { title: 'Harbor Logistics Facility', rate: 10, term: 24, access: 'general' as const, mode: 'range' as const, min: 10000, max: 100000, raised: 80000, target: 750000 },
  { title: 'Downtown Retail Refit', rate: 8, term: 9, access: 'whitelist' as const, whitelisted: false, mode: 'fixed' as const, fixed: 15000, raised: 90000, target: 120000 },
]

const offerings = computed<Offering[]>(() =>
  rawOfferings.map(o => {
    const allowed = o.access === 'general' || !!o.whitelisted
    const pct = Math.min(100, Math.round((o.raised / o.target) * 100))
    const limitsLabel = 'myAllocation' in o && o.myAllocation != null
      ? moneyShort(o.myAllocation) + ' allocation'
      : o.mode === 'fixed' && o.fixed != null
        ? moneyShort(o.fixed) + ' fixed'
        : moneyShort(o.min ?? 0) + ' – ' + moneyShort(o.max ?? 0)
    const access = o.access === 'whitelist'
      ? { accessLabel: 'Whitelist', accessBg: '#ebf0ff', accessColor: '#2b50c8', accessDot: '#3366ff' }
      : { accessLabel: 'Open to all', accessBg: '#e6f8f1', accessColor: '#0a7a52', accessDot: '#00bf7a' }
    return { ...o, allowed, pct, limitsLabel, ...access }
  })
)

const selected = ref<Offering | null>(null)
const applyAmount = ref(0)
const applyDone = ref(false)

const amountLocked = computed(() => {
  if (!selected.value) return false
  return ('myAllocation' in selected.value && selected.value.myAllocation != null) || selected.value.mode === 'fixed'
})

const applyInterest = computed(() => {
  if (!selected.value) return 0
  return applyAmount.value * (selected.value.rate / 100) * (selected.value.term / 12)
})
const applyTotal = computed(() => applyAmount.value + applyInterest.value)

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

function openApply(o: Offering) {
  const start = ('myAllocation' in o && o.myAllocation != null) ? o.myAllocation
    : o.mode === 'fixed' && o.fixed != null ? o.fixed : o.min ?? 0
  selected.value = o
  applyAmount.value = start
  applyDone.value = false
}

function closeApply() {
  selected.value = null
  applyDone.value = false
}
</script>
