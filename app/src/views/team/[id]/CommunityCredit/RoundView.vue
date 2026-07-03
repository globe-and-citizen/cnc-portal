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
    <CreditRoundTimeline v-else :round="round" />

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
  useFixedReturnGetLendingOffer,
  useFixedReturnOfferLenders
} from '@/composables/fixedReturn/reads'
import {
  useFixedReturnClaimRefund,
  useFixedReturnMarkAsRefundable
} from '@/composables/fixedReturn/writes'
import {
  classifyError,
  isLendingOfferAcceptingFunds,
  offerLenderToCreditLender,
  resolveUser,
  statusMeta
} from '@/utils'
import type { CreditRound, LendingOfferStruct } from '@/types'
import CreditLayoutSwitcher from '@/components/sections/CommunityCreditView/CreditLayoutSwitcher.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'
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
      offerLenderToCreditLender(lender, (address) => resolveUser(address).name, userStore.address)
    )
  }
})

const status = computed(() => statusMeta(round.value?.status ?? 'open'))
const lendRound = ref<CreditRound | null>(null)

/** Open, but the subscription window has closed without reaching target → owner can refund. */
const canMarkRefundable = computed(() => {
  const current = offer.value
  return !!current && current.state === 0 && !isLendingOfferAcceptingFunds(current)
})

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

const markRefundableResult = useFixedReturnMarkAsRefundable()
const claimRefundResult = useFixedReturnClaimRefund()

async function invalidateRound() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
    queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] }),
    queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] })
  ])
}

async function markRefundable() {
  try {
    await markRefundableResult.mutateAsync({ args: [offerId.value] })
    toast.add({
      title: 'Round marked refundable — lenders can reclaim their principal',
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

async function claimRefund() {
  try {
    await claimRefundResult.mutateAsync({ args: [offerId.value] })
    toast.add({ title: 'Refund claimed — your principal was returned', color: 'success' })
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
  color: 'primary' | 'neutral'
  variant: 'solid' | 'soft'
  loading?: boolean
  run: () => void
}

const ctas = computed<Cta[]>(() => {
  const r = round.value
  if (!r) return []
  const list: Cta[] = []

  // Anyone can lend to an open round — the owner is a member too.
  if (r.status === 'open') {
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
        run: () =>
          router.push({
            name: 'community-credit-repay',
            params: { id: teamId.value, roundId: r.id }
          })
      })
    } else if (r.status === 'open' && canMarkRefundable.value) {
      list.push({
        test: 'round-cta-refundable',
        label: 'Mark refundable',
        icon: 'heroicons:exclamation-triangle',
        color: 'primary',
        variant: 'soft',
        loading: markRefundableResult.isPending.value,
        run: markRefundable
      })
    }
  } else if (r.status === 'refundable') {
    list.push({
      test: 'round-cta-claim',
      label: 'Claim refund',
      icon: 'heroicons:arrow-uturn-left',
      color: 'primary',
      variant: 'solid',
      loading: claimRefundResult.isPending.value,
      run: claimRefund
    })
  }

  return list
})
</script>
