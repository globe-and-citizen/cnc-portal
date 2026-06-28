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

    <!-- Loading state -->
    <div
      v-if="isLoading"
      data-test="marketplace-loading"
      class="rounded-2xl border border-[#e6efe9] bg-white px-5 py-10 text-center text-sm text-[#9aaba2]"
    >
      Loading offerings…
    </div>

    <!-- Empty state -->
    <div
      v-else-if="offerings.length === 0"
      data-test="marketplace-empty"
      class="rounded-2xl border border-[#e6efe9] bg-white px-5 py-10 text-center text-sm text-[#9aaba2]"
    >
      No offerings available yet.
    </div>

    <!-- Offering cards -->
    <div
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))"
    >
      <div
        v-for="o in offerings"
        :key="o.id"
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
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">
              {{ termLabel(o.term, o.termUnit) }}
            </div>
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
          {{ lenderCtaLabel(o) }}
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
      :amount-locked="false"
      :limits-hint="limitsHint"
      :error="modalError"
      :loading="isSubmitting"
      @close="closeApply"
      @submit="submitApplication"
      @update:amount="applyAmount = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { parseUnits, zeroAddress, type Address } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import ApplyOfferingModal from './ApplyOfferingModal.vue'
import { config } from '@/wagmi.config'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useFixedReturnAddress, useFixedReturnAllOffers } from '@/composables/fixedReturn/reads'
import { useFixedReturnLendFunds } from '@/composables/fixedReturn/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useGetFixedReturnOfferingsQuery } from '@/queries'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import {
  decimalsForOfferingToken,
  expectedReturn,
  lenderCtaLabel,
  log,
  moneyShort,
  parseError,
  termLabel,
  toLenderOffering
} from '@/utils'
import type { LenderOffering } from '@/types'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const fixedReturnAddress = useFixedReturnAddress()

const { data: rawOfferings, isLoading } = useFixedReturnAllOffers()
const { data: offeringMetadata } = useGetFixedReturnOfferingsQuery({
  queryParams: { teamId: teamStore.currentTeamId }
})

// Only Open offers can actually accept new lenders — lendFunds itself rejects any
// other state, so there's no point showing Funded/Refundable/Repaying offers here.
const openOffers = computed(() =>
  (rawOfferings.value ?? []).filter(({ offer }) => offer.state === 0)
)

interface LenderPosition {
  allocation: bigint
  deposited: bigint
}

// Whitelist allocation and cumulative deposits are both per-connected-lender, so
// they're fetched separately from the shared all-offers query rather than baked into
// it. lendFunds enforces the cumulative total on-chain (allocation or lenderCap), so
// the UI needs `deposited` for every open offer, not just Whitelist ones, to know how
// much room a lender actually has left.
async function fetchMyLenderPositions(): Promise<Map<number, LenderPosition>> {
  const address = fixedReturnAddress.value
  const lender = userStore.address as Address | undefined
  if (!address || !lender) return new Map()

  const entries = await Promise.all(
    openOffers.value.map(async ({ offerId, offer }) => {
      try {
        const [allocation, deposited] = await Promise.all([
          offer.fundingAccess === 1
            ? (readContract(config, {
                address,
                abi: FIXED_RETURN_ABI,
                functionName: 'lenderAllocation',
                args: [BigInt(offerId), lender]
              }) as Promise<bigint>)
            : Promise.resolve(0n),
          readContract(config, {
            address,
            abi: FIXED_RETURN_ABI,
            functionName: 'lenderDeposits',
            args: [BigInt(offerId), lender]
          }) as Promise<bigint>
        ])
        return [offerId, { allocation, deposited }] as const
      } catch (error) {
        log.error(`Failed to fetch lender position for offer #${offerId}:`, parseError(error))
        return [offerId, { allocation: 0n, deposited: 0n }] as const
      }
    })
  )
  return new Map(entries)
}

// Plain offerIds, not `openOffers` itself — the raw offer structs carry bigint
// fields, and TanStack Query hashes the query key with JSON.stringify, which can't
// serialize BigInt.
const openOfferIds = computed(() => openOffers.value.map(({ offerId }) => offerId))

const { data: myLenderPositions } = useQuery({
  queryKey: ['fixedReturnMyLenderPositions', fixedReturnAddress, userStore.address, openOfferIds],
  queryFn: fetchMyLenderPositions,
  enabled: computed(() => !!fixedReturnAddress.value && openOffers.value.length > 0)
})

const offerings = computed<LenderOffering[]>(() => {
  const metadataByOfferId = new Map(offeringMetadata.value?.map((m) => [m.offerId, m.title]))
  const positions = myLenderPositions.value ?? new Map()
  return openOffers.value.map(({ offerId, offer, decimals }) => {
    const position = positions.get(offerId) ?? { allocation: 0n, deposited: 0n }
    return toLenderOffering(
      offerId,
      offer,
      decimals,
      position.allocation,
      position.deposited,
      metadataByOfferId.get(offerId)
    )
  })
})

const toast = useToast()
const queryClient = useQueryClient()

const selected = ref<LenderOffering | null>(null)
const applyAmount = ref(0)
const submitError = ref<string | null>(null)

const applyTotal = computed(() => {
  if (!selected.value) return 0
  return expectedReturn(applyAmount.value, selected.value.rate)
})
const applyInterest = computed(() => applyTotal.value - applyAmount.value)

const amountError = computed(() => {
  if (!selected.value) return ''
  const remaining = selected.value.remaining
  if (remaining != null && applyAmount.value > remaining)
    return 'Maximum loan amount is ' + moneyShort(remaining) + '.'
  return ''
})

const modalError = computed(() => amountError.value || submitError.value || '')

const limitsHint = computed(() => {
  if (!selected.value) return ''
  const { access, cap, remaining, myDeposited } = selected.value
  if (cap == null) return 'No per-lender cap for this offering.'
  const noun = access === 'whitelist' ? 'allocation' : 'cap'
  if (myDeposited > 0) {
    return `You've already lent ${moneyShort(myDeposited)} of your ${moneyShort(cap)} ${noun} — ${moneyShort(remaining ?? 0)} remaining.`
  }
  if (access === 'whitelist')
    return 'Your allocation of ' + moneyShort(cap) + ' was set by the project admin.'
  return 'Maximum per lender: ' + moneyShort(cap) + '.'
})

const selectedToken = computed(() => selected.value?.token ?? zeroAddress)
const selectedDecimals = computed(() =>
  selected.value ? (decimalsForOfferingToken(selected.value.token) ?? 6) : 6
)
const applyAmountUnits = computed(() =>
  parseUnits(String(applyAmount.value || 0), selectedDecimals.value)
)

const { data: allowance, refetch: refetchAllowance } = useErc20Allowance(
  selectedToken,
  computed(() => (userStore.address as Address) ?? zeroAddress),
  computed(() => fixedReturnAddress.value ?? zeroAddress)
)
const allowanceValue = computed(() => (typeof allowance.value === 'bigint' ? allowance.value : 0n))

const approveTokenResult = useERC20Approve(selectedToken)
const lendFundsResult = useFixedReturnLendFunds()

const isSubmitting = computed(
  () => approveTokenResult.isPending.value || lendFundsResult.isPending.value
)

function openApply(o: LenderOffering) {
  selected.value = o
  applyAmount.value = 0
  submitError.value = null
}

function closeApply() {
  selected.value = null
}

async function submitApplication() {
  if (!selected.value || !fixedReturnAddress.value) return
  submitError.value = null

  const offer = selected.value
  const amountUnits = applyAmountUnits.value

  try {
    await refetchAllowance()
    if (allowanceValue.value < amountUnits) {
      await approveTokenResult.mutateAsync({ args: [fixedReturnAddress.value, amountUnits] })
    }
    await lendFundsResult.mutateAsync({ args: [BigInt(offer.id), amountUnits] })

    toast.add({
      title: `You lent ${moneyShort(applyAmount.value)} to ${offer.title}`,
      color: 'success'
    })
    closeApply()
    queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] })
  } catch (error) {
    submitError.value =
      (error as { shortMessage?: string; message?: string })?.shortMessage ??
      (error as Error)?.message ??
      'Failed to submit application'
  }
}
</script>
