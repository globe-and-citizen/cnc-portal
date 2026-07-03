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
      <div class="text-xl font-extrabold tracking-tight text-[#0f3d2e]">{{ offering.title }}</div>
      <StatusBadge :status="offering.status" />
    </div>

    <!-- Funding / repayment gauges -->
    <div class="grid grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <div class="text-base font-extrabold text-[#0f3d2e]">Funding progress</div>
          <div class="mt-0.5 text-xs text-[#9aaba2]">
            How much of the target this offering has raised from lenders.
          </div>
        </template>
        <div class="flex flex-col items-center gap-0.5 text-center">
          <ProgressGauge :percent="fundingPct" label="funded" :size="100" />
          <div class="mt-2 text-base font-extrabold text-[#0f3d2e]">
            {{ formatOfferingTokenAmount(offering.raised, offering.token) }}
          </div>
          <div class="text-xs text-[#9aaba2]">
            raised of {{ formatOfferingTokenAmount(offering.target, offering.token) }}
          </div>
          <div
            v-if="offering.target > offering.raised"
            class="mt-0.5 text-xs font-semibold text-[#0a7a52]"
          >
            {{ formatOfferingTokenAmount(offering.target - offering.raised, offering.token) }}
            remaining
          </div>
        </div>
      </UCard>
      <UCard>
        <template #header>
          <div class="text-base font-extrabold text-[#0f3d2e]">Repayment progress</div>
          <div class="mt-0.5 text-xs text-[#9aaba2]">
            How much of the total bullet repayment has been paid back to lenders.
          </div>
        </template>
        <div class="flex flex-col items-center gap-0.5 text-center">
          <ProgressGauge :percent="repaymentPct" label="repaid" :size="100" />
          <div class="mt-2 text-base font-extrabold text-[#0f3d2e]">
            {{ formatOfferingTokenAmount(totalPaid, offering.token) }}
          </div>
          <div class="text-xs text-[#9aaba2]">
            repaid of {{ formatOfferingTokenAmount(totalExpected, offering.token) }}
          </div>
          <div v-if="totalExpected > totalPaid" class="mt-0.5 text-xs font-semibold text-[#0a7a52]">
            {{ formatOfferingTokenAmount(totalExpected - totalPaid, offering.token) }} remaining
          </div>
        </div>
      </UCard>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <UCard v-for="stat in statCards" :key="stat.label">
        <div class="mb-3 flex items-center gap-3">
          <div
            class="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
            :style="{ background: stat.iconBg, color: stat.iconColor }"
          >
            <UIcon :name="stat.icon" class="size-5" />
          </div>
          <span class="text-sm font-semibold text-[#7d8e84]">{{ stat.label }}</span>
        </div>
        <div class="text-2xl font-extrabold tracking-tight text-[#0f3d2e]">{{ stat.value }}</div>
      </UCard>
    </div>

    <!-- Issuer Actions -->
    <OfferingIssuerActions
      v-if="isOwner && (offering.status === 'funded' || offering.status === 'open')"
      :offering="offering"
    />

    <!-- Lenders -->
    <OfferingLendersSection
      :partners="partners"
      :is-loading="isLoading"
      :can-claim-refund="canClaimRefund"
      :claim-refund-is-pending="claimRefundResult.isPending.value"
      :claiming-lender-address="claimingLenderAddress"
      @claim-refund="claimRefund"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAddress, isAddressEqual } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import { useQueryClient } from '@tanstack/vue-query'
import StatusBadge from './StatusBadge.vue'
import ProgressGauge from './ProgressGauge.vue'
import OfferingIssuerActions from './OfferingIssuerActions.vue'
import OfferingLendersSection from './OfferingLendersSection.vue'
import { useFixedReturnOfferLenders, useFixedReturnOwner } from '@/composables/fixedReturn/reads'
import { useFixedReturnClaimRefund } from '@/composables/fixedReturn/writes'
import { useUserDataStore } from '@/stores'
import {
  buildFixedReturnLenderRows,
  formatOfferingTokenAmount,
  getOfferingDetailTotals,
  isOfferingPastMaturity,
  maturityLabel,
  percentOf,
  resolveUser
} from '@/utils'
import type { OfferingSummary } from '@/types'

const props = defineProps<{ offering: OfferingSummary }>()
defineEmits<{ back: [] }>()

const userStore = useUserDataStore()
const toast = useToast()
const queryClient = useQueryClient()
const { data: fixedReturnOwnerAddress } = useFixedReturnOwner()
const claimRefundResult = useFixedReturnClaimRefund()
const claimingLenderAddress = ref<string | null>(null)
const isOwner = computed(() => {
  const ownerAddress = fixedReturnOwnerAddress.value
  return (
    typeof ownerAddress === 'string' &&
    isAddress(ownerAddress, { strict: false }) &&
    isAddress(userStore.address, { strict: false }) &&
    isAddressEqual(ownerAddress, userStore.address)
  )
})
const canClaimRefund = computed(() => props.offering.status === 'closed')

// Bullet repayment: principal + interest repaid as one combined payment per lender,
// due at the offering's maturity (start date + term) — no interim schedule.
const maturityFmt = computed(() =>
  maturityLabel(props.offering.startDate, props.offering.term, props.offering.termUnit)
)

// repayLenders has no on-chain maturity check — the issuer can repay early or in
// installments — so "nothing repaid yet" only means overdue once maturity has
// actually passed. Before that, an unpaid loan is just on-track, not late.
const isPastMaturity = computed(() => {
  return isOfferingPastMaturity(
    props.offering.startDate,
    props.offering.term,
    props.offering.termUnit
  )
})

const { data: lenders, isLoading } = useFixedReturnOfferLenders(
  computed(() => props.offering.id),
  computed(() => props.offering.token)
)

// repayLenders distributes proportionally to each lender's deposit share, so a
// lender's cumulative paid-to-date is their deposit's share of totalRepaid so far —
// there's no separate "amount paid to this lender" getter on-chain to read directly.
const partners = computed(() =>
  buildFixedReturnLenderRows({
    lenders: lenders.value ?? [],
    offering: props.offering,
    pastMaturity: isPastMaturity.value,
    maturity: maturityFmt.value,
    resolveName: (address) => resolveUser(address).name ?? 'User'
  })
)

const totals = computed(() =>
  getOfferingDetailTotals(lenders.value ?? [], props.offering.totalRepaid)
)
const totalPrincipal = computed(() => totals.value.totalPrincipal)
const totalExpected = computed(() => totals.value.totalExpected)
const totalPaid = computed(() => totals.value.totalPaid)

const fundingPct = computed(() => percentOf(props.offering.raised, props.offering.target))
const repaymentPct = computed(() => percentOf(totalPaid.value, totalExpected.value))

function claimRefund(lenderAddress: string) {
  if (claimRefundResult.isPending.value) return
  claimingLenderAddress.value = lenderAddress
  claimRefundResult.mutate(
    { args: [BigInt(props.offering.id)] },
    {
      onSuccess: () => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] }),
          queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] })
        ])
        toast.add({
          title: 'Refund claimed successfully',
          description: 'Your principal has been returned.',
          color: 'success'
        })
      },
      onSettled: () => {
        claimingLenderAddress.value = null
      }
    }
  )
}

const statCards = computed(() => [
  {
    label: 'Total principal lent',
    value: formatOfferingTokenAmount(totalPrincipal.value, props.offering.token),
    icon: 'heroicons:credit-card',
    iconBg: '#ebf0ff',
    iconColor: '#3366ff'
  },
  {
    label: 'Total expected return',
    value: formatOfferingTokenAmount(totalExpected.value, props.offering.token),
    icon: 'heroicons:arrow-trending-up',
    iconBg: '#e6f8f1',
    iconColor: '#00a86c'
  },
  {
    label: 'Outstanding balance',
    value: formatOfferingTokenAmount(totalExpected.value - totalPaid.value, props.offering.token),
    icon: 'heroicons:clock',
    iconBg: '#fff6e0',
    iconColor: '#cc8a00'
  },
  {
    label: 'Overdue lenders',
    value: String(partners.value.filter((p) => p.status === 'overdue').length),
    icon: 'heroicons:exclamation-triangle',
    iconBg: '#ffe9e3',
    iconColor: '#d6431f'
  }
])
</script>
