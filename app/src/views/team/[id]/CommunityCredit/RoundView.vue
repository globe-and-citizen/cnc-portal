<template>
  <div v-if="round" class="flex flex-col gap-4.5">
    <!-- Back -->
    <button
      type="button"
      class="text-muted hover:text-default flex cursor-pointer items-center gap-2 text-sm"
      @click="goList"
    >
      <UIcon name="heroicons:arrow-left" class="size-4" />
      All rounds
    </button>

    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight">{{ round.name }}</h1>
          <UBadge :color="status.color" variant="subtle" :label="status.label" size="lg" />
          <span
            class="border-default bg-muted inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1.5 text-xs font-semibold"
          >
            <span
              class="bg-primary/15 text-primary flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
            >
              $
            </span>
            {{ round.token }}
          </span>
        </div>
        <p class="text-muted mt-1.5 max-w-2xl text-sm leading-relaxed">{{ round.desc }}</p>
      </div>
      <div class="flex items-center gap-2.5">
        <UButton
          v-for="action in ctas"
          :key="action.test"
          :color="action.color"
          :variant="action.variant"
          :icon="action.icon"
          :label="action.label"
          :loading="action.loading"
          :data-test="action.test"
          @click="action.run"
        />
      </div>
    </div>

    <!-- Layout explorer -->
    <CreditLayoutSwitcher />

    <!-- Active variant -->
    <CreditRoundLedger v-if="store.variant === 'ledger'" :round="round" />
    <CreditRoundGauge v-else-if="store.variant === 'gauge'" :round="round" />
    <CreditRoundTimeline v-else-if="store.variant === 'timeline'" :round="round" />
    <!-- Same panel the "Repay round" button switches to — CreditRepayPanel reads
         roundId/teamId straight from this page's own route params. -->
    <CreditRepayPanel v-else />

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
import { classifyError, offerLenderToCreditLender, resolveUser, statusMeta } from '@/utils'
import type { CreditRound, LendingOfferStruct } from '@/types'
import CreditAccountTransactions from '@/components/sections/CommunityCreditView/CreditAccountTransactions.vue'
import CreditLayoutSwitcher from '@/components/sections/CommunityCreditView/CreditLayoutSwitcher.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'
import CreditRepayPanel from '@/components/sections/CommunityCreditView/CreditRepayPanel.vue'
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

const fixedReturnAddress = useFixedReturnAddress()
const baseRound = computed(() => store.getRound(roundId.value))
const { data: rawOffer } = useFixedReturnGetLendingOffer(offerId)
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
    queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] })
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

function onLent() {
  lendRound.value = null
}

type Cta = {
  test: string
  label: string
  icon: string
  color: 'primary' | 'neutral' | 'warning'
  variant: 'solid' | 'soft'
  loading?: boolean
  run: () => void
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
    if (r.status === 'active' || r.status === 'funded') {
      list.push({
        test: 'round-cta-repay',
        label: 'Repay round',
        icon: 'heroicons:arrow-uturn-left',
        color: 'primary',
        variant: 'solid',
        // Same behavior as clicking the "Repay" layout-exploration pill.
        run: () => store.setVariant('repay')
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
