<template>
  <div class="flex flex-col gap-6">

    <UButton
      size="sm"
      variant="ghost"
      icon="heroicons:arrow-left"
      label="Back to offerings"
      data-test="offering-detail-back-button"
      @click="$emit('back')"
    />

    <div class="flex items-center justify-between">
      <div class="text-xl font-extrabold text-[#0f3d2e] tracking-tight">{{ offering.title }}</div>
      <StatusBadge :status="offering.status" />
    </div>

    <!-- Funding / repayment gauges -->
    <div class="grid grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <div class="text-base font-extrabold text-[#0f3d2e]">Funding progress</div>
          <div class="text-xs text-[#9aaba2] mt-0.5">How much of the target this offering has raised from lenders.</div>
        </template>
        <div class="flex flex-col items-center text-center gap-0.5">
          <ProgressGauge :percent="fundingPct" label="funded" :size="100" />
          <div class="text-base font-extrabold text-[#0f3d2e] mt-2">{{ moneyFmt(offering.raised) }}</div>
          <div class="text-xs text-[#9aaba2]">raised of {{ moneyFmt(offering.target) }}</div>
          <div v-if="offering.target > offering.raised" class="text-xs font-semibold text-[#0a7a52] mt-0.5">
            {{ moneyFmt(offering.target - offering.raised) }} remaining
          </div>
        </div>
      </UCard>
      <UCard>
        <template #header>
          <div class="text-base font-extrabold text-[#0f3d2e]">Repayment progress</div>
          <div class="text-xs text-[#9aaba2] mt-0.5">How much of the total bullet repayment has been paid back to lenders.</div>
        </template>
        <div class="flex flex-col items-center text-center gap-0.5">
          <ProgressGauge :percent="repaymentPct" label="repaid" :size="100" />
          <div class="text-base font-extrabold text-[#0f3d2e] mt-2">{{ moneyFmt(totalPaid) }}</div>
          <div class="text-xs text-[#9aaba2]">repaid of {{ moneyFmt(totalExpected) }}</div>
          <div v-if="totalExpected > totalPaid" class="text-xs font-semibold text-[#0a7a52] mt-0.5">
            {{ moneyFmt(totalExpected - totalPaid) }} remaining
          </div>
        </div>
      </UCard>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="stat in statCards" :key="stat.label">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-none" :style="{ background: stat.iconBg, color: stat.iconColor }">
            <UIcon :name="stat.icon" class="size-5" />
          </div>
          <span class="text-sm text-[#7d8e84] font-semibold">{{ stat.label }}</span>
        </div>
        <div class="text-2xl font-extrabold tracking-tight text-[#0f3d2e]">{{ stat.value }}</div>
      </UCard>
    </div>

    <!-- Lenders -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="text-base font-extrabold text-[#0f3d2e]">
            Lenders <span class="text-sm font-semibold text-[#9aaba2]">· {{ partners.length }}</span>
          </div>
          <div class="flex items-center gap-2 h-9 px-3 border border-[#e0eae5] rounded-xl text-sm text-[#7d8e84] w-56">
            <UIcon name="heroicons:magnifying-glass" class="size-4 flex-none" />
            <span>Search lenders…</span>
          </div>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse" style="min-width: 820px">
          <thead>
            <tr class="bg-[#f7faf8]">
              <th class="text-left text-xs font-bold text-[#81948a] uppercase tracking-wide px-5 py-3">Lender</th>
              <th class="text-right text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Principal</th>
              <th class="text-right text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Rate</th>
              <th class="text-right text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Expected return</th>
              <th class="text-left text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Paid to date</th>
              <th class="text-left text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Maturity</th>
              <th class="text-left text-xs font-bold text-[#81948a] uppercase tracking-wide px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in partners"
              :key="p.address"
              class="border-t border-[#f0f4f1] hover:bg-[#f7fbf9] transition-colors"
            >
              <td class="px-5 py-4">
                <UserComponent :user="{ address: p.address, name: p.name }" class="flex-1 min-w-0" />
              </td>
              <td class="px-4 py-4 text-right text-sm font-bold text-[#0f3d2e] whitespace-nowrap">{{ p.principalFmt }}</td>
              <td class="px-4 py-4 text-right text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">{{ p.rateFmt }}</td>
              <td class="px-4 py-4 text-right text-sm font-bold text-[#0f3d2e] whitespace-nowrap">{{ p.expectedFmt }}</td>
              <td class="px-4 py-4" style="min-width: 150px">
                <div class="flex justify-between text-sm font-semibold mb-1.5">
                  <span>{{ p.paidFmt }}</span>
                  <span class="text-[#9aaba2]">{{ p.pctLabel }}</span>
                </div>
                <div class="h-1.5 rounded-full bg-[#eef3f0] overflow-hidden">
                  <div class="h-full rounded-full" :style="{ width: p.pctWidth, background: p.barColor }"></div>
                </div>
              </td>
              <td class="px-4 py-4 text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">{{ p.maturityFmt }}</td>
              <td class="px-5 py-4">
                <StatusBadge :status="p.status" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import UserComponent from '@/components/UserComponent.vue'
import ProgressGauge from './ProgressGauge.vue'
import { addTerm, fmtDate, money as moneyFmt, type OfferingSummary } from './offeringForm'

const props = defineProps<{ offering: OfferingSummary }>()
defineEmits<{ back: [] }>()

type Status = 'overdue' | 'partial' | 'completed'

// Bullet repayment: principal + interest repaid as one combined payment per lender,
// due at the offering's maturity (start date + term) — no interim schedule.
const maturityFmt = computed(() => {
  const start = new Date(props.offering.startDate + 'T00:00:00')
  return fmtDate(addTerm(start, props.offering.term, 'months').toISOString().slice(0, 10))
})

// paidRatio: 0–1 share of the bullet repayment settled so far. The admin can repay a
// lender gradually rather than all at once, so this isn't just paid-or-not.
const partnersRaw = [
  { address: '0x7F3a…2B9c', name: 'Amara Okonkwo', principal: 50000, paidRatio: 1 },
  { address: '0x4D21…A8e1', name: 'Liang Wei', principal: 120000, paidRatio: 1 },
  { address: '0x9C56…11Fa', name: 'Sofia Marchetti', principal: 75000, paidRatio: 0 },
  { address: '0x2E8b…7C40', name: 'Daniel Krause', principal: 30000, paidRatio: 1 },
  { address: '0xB1f7…3D92', name: 'Priya Nair', principal: 200000, paidRatio: 0.45 },
  { address: '0x6a09…E5Dd', name: 'Marcus Bell', principal: 45000, paidRatio: 0.7 },
]

function statusFor(paidRatio: number): Status {
  if (paidRatio >= 1) return 'completed'
  if (paidRatio <= 0) return 'overdue'
  return 'partial'
}

const partners = computed(() =>
  partnersRaw.map(p => {
    const expected = p.principal * (1 + props.offering.rate / 100)
    const paid = expected * p.paidRatio
    const status = statusFor(p.paidRatio)
    const pct = expected ? Math.min(100, Math.round((paid / expected) * 100)) : 0
    const barColor = status === 'overdue' ? '#ff5630' : status === 'partial' ? '#ffab00' : '#00bf7a'
    return {
      name: p.name, address: p.address,
      principalFmt: moneyFmt(p.principal), rateFmt: props.offering.rate.toFixed(1) + '%',
      expectedFmt: moneyFmt(expected), paidFmt: moneyFmt(paid),
      pctLabel: pct + '%', pctWidth: pct + '%', barColor,
      maturityFmt: maturityFmt.value,
      status,
    }
  })
)

const totalPrincipal = computed(() => partnersRaw.reduce((a, p) => a + p.principal, 0))
const totalExpected = computed(() =>
  partnersRaw.reduce((a, p) => a + p.principal * (1 + props.offering.rate / 100), 0)
)
const totalPaid = computed(() =>
  partnersRaw.reduce((a, p) => a + p.principal * (1 + props.offering.rate / 100) * p.paidRatio, 0)
)

const fundingPct = computed(() =>
  props.offering.target ? (props.offering.raised / props.offering.target) * 100 : 0
)
const repaymentPct = computed(() =>
  totalExpected.value ? (totalPaid.value / totalExpected.value) * 100 : 0
)

const statCards = computed(() => [
  { label: 'Total principal lent', value: moneyFmt(totalPrincipal.value), icon: 'heroicons:credit-card', iconBg: '#ebf0ff', iconColor: '#3366ff' },
  { label: 'Total expected return', value: moneyFmt(totalExpected.value), icon: 'heroicons:arrow-trending-up', iconBg: '#e6f8f1', iconColor: '#00a86c' },
  { label: 'Outstanding balance', value: moneyFmt(totalExpected.value - totalPaid.value), icon: 'heroicons:clock', iconBg: '#fff6e0', iconColor: '#cc8a00' },
  { label: 'Overdue lenders', value: String(partnersRaw.filter(p => p.paidRatio <= 0).length), icon: 'heroicons:exclamation-triangle', iconBg: '#ffe9e3', iconColor: '#d6431f' },
])
</script>
