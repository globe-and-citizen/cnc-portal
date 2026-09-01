<template>
  <div v-if="round" class="flex flex-col gap-4.5">
    <button
      type="button"
      class="text-muted hover:text-default flex cursor-pointer items-center gap-2 text-sm"
      data-test="round-back"
      @click="goList"
    >
      <UIcon name="heroicons:arrow-left" class="size-4" />
      All rounds
    </button>
    <CreditRoundReadState
      v-if="store.isError"
      :has-round="true"
      :is-loading="store.isLoading"
      :is-error="store.isError"
    />
    <CreditRoundDetailSection
      v-model="activeVariant"
      :round="round"
      :repayment="repayment"
      :is-owner="store.isOwner"
      :fixed-return-address="fixedReturnAddress"
      @repay="repayRound"
      @cancel="goRound"
    >
      <template #actions>
        <CreditRoundActions
          :round="round"
          :is-owner="store.isOwner"
          :is-lend-allowed="canLend"
          :is-repayment-available="repayment.isReady && repayment.canRepayViaBank"
          :is-refund-pending="refundLendersResult.isPending.value"
          :is-partial-funding-pending="acceptPartialFundingResult.isPending.value"
          @lend="lendRound = $event"
          @repay="activeVariant = 'repay'"
          @refund="refundLenders"
          @accept-partial-funding="acceptPartialFunding"
        />
      </template>
    </CreditRoundDetailSection>
    <CreditLendModal :round="lendRound" @close="lendRound = null" @lent="onLent" />
  </div>
  <CreditRoundReadState
    v-else
    :has-round="false"
    :is-loading="store.isLoading"
    :is-error="store.isError"
    @back="goList"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { useQueryClient } from '@tanstack/vue-query'
import { formatUnits, isAddress, isAddressEqual, zeroAddress } from 'viem'
import { useCommunityCreditStore, useUserDataStore } from '@/stores'
import { useBankAddress, useBankOwner } from '@/composables/bank/reads'
import { useFundFixedReturnRepayment } from '@/composables/bank/writes'
import { useErc20BalanceOf } from '@/composables/erc20/reads'
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
import { classifyError } from '@/utils/errors/classifyContractError'
import { decimalsForFixedReturnToken } from '@/utils/communityCredit/offer'
import {
  formatAmount,
  offerOutstandingObligation,
  offerLenderToCreditLender,
  ROUND_VARIANT_TAB_ITEMS
} from '@/utils/communityCredit/model'
import { isRepayableRoundStatus } from '@/utils/communityCredit/roundStatus'
import { useTransactionPresentation } from '@/composables/transactions/useTransactionPresentation'
import {
  validateRepaymentAmount,
  type CreditRound,
  type LendingOfferStruct,
  type RoundDetailVariant
} from '@/types'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'
import CreditRoundActions from '@/components/sections/CommunityCreditView/CreditRoundActions.vue'
import CreditRoundReadState from '@/components/sections/CommunityCreditView/CreditRoundReadState.vue'
import CreditRoundDetailSection from '@/components/sections/CommunityCreditView/CreditRoundDetailSection.vue'
import type { RepaymentPanelState } from '@/components/sections/CommunityCreditView/CreditRepayPanel.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const queryClient = useQueryClient()
const store = useCommunityCreditStore()
const userStore = useUserDataStore()
const { resolveUser } = useTransactionPresentation()
const teamId = computed(() => String(route.params.id))
const roundId = computed(() => String(route.params.roundId))
const offerId = computed(() => BigInt(roundId.value || '0'))
const DEFAULT_VARIANT: RoundDetailVariant = 'ledger'

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
const lendRound = ref<CreditRound | null>(null)
const bankAddress = useBankAddress()
const { data: bankOwner } = useBankOwner()
const repayResult = useFundFixedReturnRepayment()
const repaymentError = ref<string | null>(null)
const decimals = computed(() =>
  offer.value ? (decimalsForFixedReturnToken(offer.value.token) ?? 6) : 6
)
const outstandingUnits = computed(() =>
  offer.value ? offerOutstandingObligation(offer.value) : null
)
const outstanding = computed(() =>
  outstandingUnits.value === null
    ? null
    : Number(formatUnits(outstandingUnits.value, decimals.value))
)
const { data: treasuryBalanceRaw, refetch: refetchTreasuryBalance } = useErc20BalanceOf(
  tokenAddress,
  computed(() => bankAddress.value ?? zeroAddress)
)
const treasuryBalance = computed(() =>
  typeof treasuryBalanceRaw.value === 'bigint'
    ? Number(formatUnits(treasuryBalanceRaw.value, decimals.value))
    : null
)
const isRepayable = computed(() => !!round.value && isRepayableRoundStatus(round.value.status))
const canRepayViaBank = computed(() => {
  const owner = bankOwner.value
  const userAddress = userStore.address
  return (
    typeof owner === 'string' &&
    isAddress(owner) &&
    typeof userAddress === 'string' &&
    isAddress(userAddress) &&
    isAddressEqual(owner, userAddress)
  )
})
const isRepaymentReady = computed(
  () =>
    !!offer.value && outstandingUnits.value !== null && typeof treasuryBalanceRaw.value === 'bigint'
)
const repayment = computed<RepaymentPanelState>(() => ({
  outstanding: outstanding.value,
  treasuryBalance: treasuryBalance.value,
  isReady: isRepaymentReady.value,
  isRepayable: isRepayable.value,
  canRepayViaBank: canRepayViaBank.value,
  isSubmitting: repayResult.isPending.value,
  errorMessage: repaymentError.value
}))
const { data: myLenderPositions } = useFixedReturnMyLenderPositions()
const canLend = computed(() => {
  if (!round.value || !round.value.restricted) return true
  const position = myLenderPositions.value?.get(Number(round.value.id))
  return !!position && position.allocation > 0n
})
const goList = () => router.push({ name: 'community-credit', params: { id: teamId.value } })

function goRound() {
  router.push({
    name: 'community-credit-round',
    params: { id: teamId.value, roundId: roundId.value }
  })
}
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
  if (
    !round.value ||
    !bankAddress.value ||
    !isRepayable.value ||
    !canRepayViaBank.value ||
    outstandingUnits.value === null
  ) {
    return
  }
  const validation = validateRepaymentAmount({
    amount,
    decimals: decimals.value,
    outstanding: outstandingUnits.value,
    treasuryBalance: typeof treasuryBalanceRaw.value === 'bigint' ? treasuryBalanceRaw.value : null
  })
  if (!validation.valid) {
    repaymentError.value = validation.errorMessage
    return
  }
  repaymentError.value = null
  try {
    await repayResult.mutateAsync({ args: [offerId.value, validation.amountUnits] })
    await invalidateRound()
    await Promise.all([refetchOffer(), refetchTreasuryBalance()])
  } catch (error) {
    repaymentError.value = classifyError(error, { contract: 'Bank' }).userMessage
    return
  }
  toast.add({
    title: validation.isFullRepayment
      ? 'Round repaid — principal + interest returned'
      : `Repaid ${formatAmount(Number(formatUnits(validation.amountUnits, decimals.value)), round.value.token)} towards the outstanding balance`,
    color: 'success'
  })
  if (validation.isFullRepayment) goRound()
}
function onLent() {
  lendRound.value = null
}
</script>
