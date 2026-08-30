<template>
  <div v-if="round" class="flex flex-col gap-4.5">
    <CreditRoundHeader :round="round" :status="status" :ctas="ctas" @back="goList" />

    <!-- Layout exploration + Repay, each its own route param (see activeVariant). Styled to
         match the old hand-rolled CreditLayoutSwitcher: a dashed, tinted container with the
         icon+label pushed left (list-leading + mr-auto) and compact pill tabs on the right. -->
    <UTabs
      v-model="activeVariant"
      :items="ROUND_VARIANT_TAB_ITEMS"
      size="xs"
      class="w-full"
      :ui="{
        list: 'border-primary/30 bg-primary/5 items-center gap-0.5 rounded-xl border border-dashed px-3.5 py-2.5',
        indicator: 'hidden',
        trigger:
          'grow-0 shrink-0 data-[state=active]:bg-primary/10 data-[state=active]:text-primary'
      }"
    >
      <template #list-leading>
        <div class="text-primary mr-auto flex items-center gap-2.5 text-xs font-semibold">
          <UIcon name="heroicons:swatch" class="size-4" />
          Layout exploration
        </div>
      </template>
      <template #ledger>
        <CreditRoundLedger :round="round" />
      </template>
      <template #gauge>
        <CreditRoundGauge :round="round" />
      </template>
      <template #timeline>
        <CreditRoundTimeline :round="round" />
      </template>
      <template #repay>
        <CreditRepayPanel
          :round="round"
          :rows="repaymentRows"
          :outstanding="repayment.outstanding"
          :treasury-balance="repayment.treasuryBalance"
          :is-owner="store.isOwner"
          :can-repay-via-bank="repayment.canRepayViaBank"
          :submission="repayment.submission"
          @repay="repayRound"
          @cancel="goRound"
        />
      </template>
    </UTabs>

    <CreditAccountTransactions
      v-if="fixedReturnAddress"
      :fixed-return-address="fixedReturnAddress"
      :round-id="roundId"
    />

    <CreditLendModal :round="lendRound" @close="lendRound = null" @lent="onLent" />
  </div>

  <!-- Loading -->
  <div v-else-if="store.isLoading" class="flex flex-col gap-4" data-test="round-loading">
    <USkeleton class="h-8 w-64" />
    <USkeleton class="h-64 rounded-2xl" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { useQueryClient } from '@tanstack/vue-query'
import { zeroAddress } from 'viem'
import { useCommunityCreditStore, useUserDataStore } from '@/stores'
import { useCreditRoundRepayment } from '@/composables/useCreditRoundRepayment'
import {
  useFixedReturnAddress,
  useFixedReturnGetLendingOffer,
  useFixedReturnOfferLenders,
  useFixedReturnMyLenderPositions
} from '@/composables/fixedReturn/reads'
import {
  useFixedReturnRefundLenders,
  useFixedReturnAcceptPartialFunding
} from '@/composables/fixedReturn/writes'
import {
  classifyError,
  formatAmount,
  offerLenderToCreditLender,
  resolveUser,
  ROUND_VARIANT_TAB_ITEMS,
  roundToDisplayPrecision,
  statusMeta
} from '@/utils'
import type { CreditRound, Cta, LendingOfferStruct, RoundDetailVariant } from '@/types'
import CreditAccountTransactions from '@/components/sections/CommunityCreditView/CreditAccountTransactions.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'
import CreditRepayPanel from '@/components/sections/CommunityCreditView/CreditRepayPanel.vue'
import type { RepayBreakdownRow } from '@/components/sections/CommunityCreditView/CreditRepayBreakdownTable.vue'
import CreditRoundHeader from '@/components/sections/CommunityCreditView/CreditRoundHeader.vue'
import CreditRoundGauge from '@/components/sections/CommunityCreditView/CreditRoundGauge.vue'
import CreditRoundLedger from '@/components/sections/CommunityCreditView/CreditRoundLedger.vue'
import CreditRoundTimeline from '@/components/sections/CommunityCreditView/CreditRoundTimeline.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const queryClient = useQueryClient()
const store = useCommunityCreditStore()
const userStore = useUserDataStore()

const teamId = computed(() => String(route.params.id))
const roundId = computed(() => String(route.params.roundId))
const offerId = computed(() => BigInt(roundId.value || '0'))

const DEFAULT_VARIANT: RoundDetailVariant = 'ledger'

// Which round-detail tab is showing (layout exploration + Repay) — a route param, not
// app state, so a given tab is bookmarkable/shareable/reload-safe and never leaks across
// rounds (each mount reads its own route.params.roundId + view). Mirrored via
// router.replace (no history spam), same convention as IndexView's tab query param.
const activeVariant = computed<RoundDetailVariant>({
  get: () => {
    const raw = route.params.view
    const value = Array.isArray(raw) ? raw[0] : raw
    return ROUND_VARIANT_TAB_ITEMS.some((item) => item.value === value)
      ? (value as RoundDetailVariant)
      : DEFAULT_VARIANT
  },
  set: (value: RoundDetailVariant) => {
    router.replace({
      name: 'community-credit-round',
      params: {
        id: teamId.value,
        roundId: roundId.value,
        view: value === DEFAULT_VARIANT ? undefined : value
      }
    })
  }
})

const fixedReturnAddress = useFixedReturnAddress()
const baseRound = computed(() => store.getRound(roundId.value))
const { data: rawOffer, refetch: refetchOffer } = useFixedReturnGetLendingOffer(offerId)
const offer = computed(() => rawOffer.value as LendingOfferStruct | undefined)
const tokenAddress = computed(() => offer.value?.token ?? zeroAddress)
const { data: lenderData } = useFixedReturnOfferLenders(roundId, tokenAddress)

/** The list-level round (name/desc/status/amounts) enriched with its on-chain lenders. */
const round = computed<CreditRound | undefined>(() => {
  const base = baseRound.value
  if (!base) return undefined
  return {
    ...base,
    lenders: (lenderData.value ?? []).map((lender) =>
      offerLenderToCreditLender(
        lender,
        (address) => resolveUser(address).name,
        userStore.address,
        base
      )
    )
  }
})

const status = computed(() => statusMeta(round.value?.status ?? 'open'))
const lendRound = ref<CreditRound | null>(null)

/** Display-ready repayment rows share the round detail's single lender mapping. */
const repaymentRows = computed<RepayBreakdownRow[]>(() =>
  (round.value?.lenders ?? []).map((lender) => ({
    ...lender,
    interest: lender.expected - lender.amount,
    total: lender.expected,
    remaining: Math.max(0, roundToDisplayPrecision(lender.expected - lender.paid))
  }))
)
const { presentation: repayment, repay } = useCreditRoundRepayment({
  offerId,
  round,
  repaymentRows,
  offerQuery: { offer, refetch: refetchOffer }
})

const { data: myLenderPositions } = useFixedReturnMyLenderPositions()
// Restricted rounds only accept deposits from whitelisted addresses — lenderAllocation
// reads back 0 for anyone not on the whitelist, owner included. The contract already
// reverts lendFunds for them; hide the Lend action too instead of offering a button
// that's guaranteed to fail on-chain.
const canLend = computed(() => {
  if (!round.value || !round.value.restricted) return true
  const position = myLenderPositions.value?.get(Number(round.value.id))
  return !!position && position.allocation > 0n
})

/** Stalled: still Open on-chain, but the deadline passed without reaching target —
 *  owner can refund. round.status is the single source of truth for this (derived in
 *  offerStateToRoundStatus from the same offer/deadline check this used to duplicate). */
const canRefundLenders = computed(() => round.value?.status === 'stalled')

/** Same stalled-round eligibility as canRefundLenders, plus something to actually keep —
 *  acceptPartialFunding reverts on-chain if nothing was raised. */
const canAcceptPartialFunding = computed(
  () => canRefundLenders.value && (round.value?.raised ?? 0) > 0
)

function goList() {
  router.push({ name: 'community-credit', params: { id: teamId.value } })
}

function goRound() {
  router.push({
    name: 'community-credit-round',
    params: { id: teamId.value, roundId: roundId.value }
  })
}

// Redirect away only once the offer list has settled and the round genuinely doesn't exist.
watch(
  [round, () => store.isLoading],
  ([value, loading]) => {
    if (!loading && !value) goList()
  },
  { immediate: true }
)

const refundLendersResult = useFixedReturnRefundLenders()
const acceptPartialFundingResult = useFixedReturnAcceptPartialFunding()

async function invalidateRound() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
    queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] }),
    queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] }),
    queryClient.invalidateQueries({ queryKey: ['fixed-return-events-logs'] })
  ])
}

// Single owner-triggered step: refundLenders checks the deadline itself and pushes
// every lender's principal back in the same transaction — no separate "mark
// refundable" step, and no individual lender claim action anymore.
async function refundLenders() {
  try {
    await refundLendersResult.mutateAsync({ args: [offerId.value] })
    toast.add({
      title: 'Round refunded — every lender got their principal back',
      color: 'success'
    })
    await invalidateRound()
  } catch (error) {
    toast.add({
      title: classifyError(error, { contract: 'FixedReturn' }).userMessage,
      color: 'error'
    })
  }
}

// Alternative to refundLenders on the same stalled round: keep whatever was raised
// and proceed as if fully funded, instead of returning it to lenders.
async function acceptPartialFunding() {
  try {
    await acceptPartialFundingResult.mutateAsync({ args: [offerId.value] })
    toast.add({
      title: 'Round accepted with partial funding — ready to repay lenders',
      color: 'success'
    })
    await invalidateRound()
  } catch (error) {
    toast.add({
      title: classifyError(error, { contract: 'FixedReturn' }).userMessage,
      color: 'error'
    })
  }
}

async function repayRound(amount: string) {
  const outcome = await repay(amount)
  if (!outcome || !round.value) return
  toast.add({
    title: outcome.isFullRepayment
      ? 'Round repaid — principal + interest returned'
      : `Repaid ${formatAmount(outcome.amount, round.value.token)} towards the outstanding balance`,
    color: 'success'
  })
  if (outcome.isFullRepayment) goRound()
}

function onLent() {
  lendRound.value = null
}

const ctas = computed<Cta[]>(() => {
  const r = round.value
  if (!r) return []
  const list: Cta[] = []

  // Anyone eligible can lend to an open round — the owner is a member too, but a
  // restricted round still needs a whitelist allocation, owner included.
  if (r.status === 'open' && canLend.value) {
    list.push({
      test: 'round-cta-lend',
      label: 'Lend now',
      icon: 'heroicons:hand-raised',
      color: 'primary',
      variant: 'solid',
      run: () => (lendRound.value = r)
    })
  }

  if (store.isOwner) {
    const isRepayStatus = r.status === 'active' || r.status === 'funded' || r.status === 'overdue'
    if (isRepayStatus && repayment.value.canRepayViaBank) {
      list.push({
        test: 'round-cta-repay',
        label: 'Repay round',
        icon: 'heroicons:arrow-uturn-left',
        color: 'primary',
        variant: 'solid',
        // Same behavior as clicking the "Repay" layout-exploration tab.
        run: () => (activeVariant.value = 'repay')
      })
    } else if (r.status === 'stalled') {
      list.push({
        test: 'round-cta-refundable',
        label: 'Refund lenders',
        icon: 'heroicons:arrow-uturn-left',
        color: 'warning',
        variant: 'soft',
        loading: refundLendersResult.isPending.value,
        run: refundLenders
      })
      if (canAcceptPartialFunding.value) {
        list.push({
          test: 'round-cta-accept-partial',
          label: 'Accept raised funds',
          icon: 'heroicons:check-circle',
          color: 'primary',
          variant: 'soft',
          loading: acceptPartialFundingResult.isPending.value,
          run: acceptPartialFunding
        })
      }
    }
  }

  return list
})
</script>
