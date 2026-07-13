<template>
  <div v-if="round" class="flex flex-col gap-5">
    <!-- Header -->
    <div>
      <div class="flex items-center gap-2.5">
        <h1 class="text-2xl font-bold tracking-tight">Repay — {{ round.name }}</h1>
        <UBadge :color="status.color" variant="subtle" :label="status.label" size="lg" />
      </div>
      <p class="text-muted mt-1.5 text-sm">
        Returns each lender's principal plus {{ round.rate }}% interest, distributed on-chain in one
        transaction from the team treasury.
      </p>
    </div>

    <div class="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
      <CreditRepayBreakdownTable :rows="rows" :token="round.token" />

      <!-- Confirm -->
      <div class="flex flex-col gap-4">
        <div
          class="border-primary/20 from-primary/5 to-default rounded-2xl border bg-gradient-to-br p-6 shadow-sm"
        >
          <div class="text-muted text-sm">Outstanding</div>
          <div class="mt-1.5 text-[34px] font-extrabold tracking-tight">
            {{ formatAmount(outstanding, round.token) }}
          </div>
          <div class="text-muted mt-1 text-xs">
            {{ formatAmount(principalTotal, round.token) }} principal +
            {{ formatAmount(interestTotal, round.token) }} interest, due at maturity
          </div>
        </div>

        <RepayAmountPanel
          ref="amountPanelRef"
          v-model:amount="amount"
          :outstanding="outstanding"
          :treasury-balance="treasuryBalance"
          :token="round.token"
        />

        <UAlert
          color="info"
          variant="soft"
          icon="heroicons:shield-check"
          title="On-chain repayment"
          description="Sends the amount above to every lender pro-rata, in one transaction from the team treasury."
        />

        <UAlert
          v-if="submitError"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :description="submitError"
          data-test="repay-error"
        />

        <div class="flex gap-3">
          <UButton
            :color="outstanding > 0 ? 'primary' : 'neutral'"
            size="xl"
            block
            icon="heroicons:check-circle"
            :label="isSubmitting ? 'Signing…' : `Repay `"
            :loading="isSubmitting"
            :disabled="isSubmitting || numericAmount <= 0"
            data-test="confirm-repay"
            @click="confirmRepay"
          />
          <UButton
            variant="outline"
            color="neutral"
            size="xl"
            block
            label="Cancel"
            :disabled="isSubmitting"
            @click="goRound"
          />
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="store.isLoading" class="flex flex-col gap-4" data-test="repay-loading">
    <USkeleton class="h-8 w-64" />
    <USkeleton class="h-64 rounded-2xl" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { useQueryClient } from '@tanstack/vue-query'
import { formatUnits, parseUnits, zeroAddress } from 'viem'
import { useCommunityCreditStore, useUserDataStore } from '@/stores'
import {
  useFixedReturnGetLendingOffer,
  useFixedReturnOfferLenders
} from '@/composables/fixedReturn/reads'
import { useBankAddress } from '@/composables/bank/reads'
import { useFundFixedReturnRepayment } from '@/composables/bank/writes'
import { useErc20BalanceOf } from '@/composables/erc20/reads'
import {
  classifyError,
  decimalsForOfferingToken,
  formatAmount,
  offerLenderToCreditLender,
  repayableCeiling,
  resolveUser,
  roundToDisplayPrecision,
  statusMeta
} from '@/utils'
import type { LendingOfferStruct } from '@/types'
import CreditRepayBreakdownTable from './CreditRepayBreakdownTable.vue'
import RepayAmountPanel from './RepayAmountPanel.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const queryClient = useQueryClient()
const store = useCommunityCreditStore()
const userStore = useUserDataStore()
const bankAddress = useBankAddress()

const teamId = computed(() => String(route.params.id))
const roundId = computed(() => String(route.params.roundId))
const offerId = computed(() => BigInt(roundId.value || '0'))

const round = computed(() => store.getRound(roundId.value))
const status = computed(() => statusMeta(round.value?.status ?? 'active'))

const { data: rawOffer, refetch: refetchOffer } = useFixedReturnGetLendingOffer(offerId)
const offer = computed(() => rawOffer.value as LendingOfferStruct | undefined)
const tokenAddress = computed(() => offer.value?.token ?? zeroAddress)
const decimals = computed(() =>
  offer.value ? (decimalsForOfferingToken(offer.value.token) ?? 6) : 6
)
const { data: lenderData } = useFixedReturnOfferLenders(roundId, tokenAddress)

const principalTotal = computed(() =>
  (lenderData.value ?? []).reduce((sum, lender) => sum + lender.principal, 0)
)
const grandTotal = computed(() =>
  (lenderData.value ?? []).reduce((sum, lender) => sum + lender.expected, 0)
)
const interestTotal = computed(() => grandTotal.value - principalTotal.value)

// Already-repaid + treasury balance, so a round can be repaid in installments instead of
// only ever in one shot — the contract itself places no such restriction.
const alreadyRepaid = computed(() =>
  offer.value ? Number(formatUnits(offer.value.totalRepaidByIssuer, decimals.value)) : 0
)
const outstanding = computed(() =>
  Math.max(0, roundToDisplayPrecision(grandTotal.value - alreadyRepaid.value))
)

const rows = computed(() =>
  (lenderData.value ?? []).map((lender) => {
    const mapped = offerLenderToCreditLender(
      lender,
      (address) => resolveUser(address).name,
      userStore.address,
      round.value
    )
    return {
      ...mapped,
      interest: lender.expected - lender.principal,
      total: lender.expected,
      remaining: Math.max(0, roundToDisplayPrecision(lender.expected - mapped.paid))
    }
  })
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
const amount = ref('')
const numericAmount = computed(() => Math.max(0, Number(amount.value) || 0))
const amountUnits = computed(() =>
  parseUnits(numericAmount.value.toFixed(decimals.value), decimals.value)
)
const amountPanelRef = ref<{ validate: () => boolean } | null>(null)

// Prefill once with the full repayable amount — the first click still repays everything,
// matching the previous one-shot-only behavior, while leaving the amount editable.
// `immediate: true` matters: once outstanding/treasuryBalance resolve synchronously
// (e.g. mocked data already populated before mount), there's no further "change" for a
// non-immediate watch to observe, so it would otherwise never fire.
const amountInitialized = ref(false)
watch(
  () => repayableCeiling(outstanding.value, treasuryBalance.value),
  (value) => {
    if (!amountInitialized.value && value > 0) {
      amount.value = String(value)
      amountInitialized.value = true
    }
  },
  { immediate: true }
)

const repayResult = useFundFixedReturnRepayment()
const isSubmitting = computed(() => repayResult.isPending.value)
const submitError = ref<string | null>(null)

function goList() {
  router.push({ name: 'community-credit', params: { id: teamId.value } })
}
function goRound() {
  router.push({
    name: 'community-credit-round',
    params: { id: teamId.value, roundId: roundId.value }
  })
}

// Redirect only once the offer list has settled and the round genuinely doesn't exist.
watch(
  [round, () => store.isLoading],
  ([value, loading]) => {
    if (!loading && !value) goList()
  },
  { immediate: true }
)

async function confirmRepay() {
  if (!bankAddress.value || numericAmount.value <= 0) return
  submitError.value = null
  if (!amountPanelRef.value?.validate()) return

  try {
    await repayResult.mutateAsync({ args: [offerId.value, amountUnits.value] })
    const isFullRepay = numericAmount.value >= outstanding.value
    toast.add({
      title: isFullRepay
        ? 'Round repaid — principal + interest returned'
        : `Repaid ${formatAmount(numericAmount.value, round.value?.token, 4)} towards the outstanding balance`,
      color: 'success'
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
      queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] }),
      queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] })
    ])
    // `offer` is a separate wagmi-managed read (its own internal query key, not the
    // ['fixedReturnAllOffers', …] key invalidated above), so totalRepaidByIssuer here
    // — and therefore alreadyRepaid/outstanding — would otherwise stay stale after a
    // repay while the breakdown table's per-lender "Paid so far" (sourced from `round`,
    // which does live under 'fixedReturnAllOffers') updates immediately. Refetch both
    // so a second, same-session installment repay starts from consistent figures.
    refetchOffer()
    refetchTreasuryBalance()
    if (isFullRepay) goRound()
  } catch (error) {
    submitError.value = classifyError(error, { contract: 'Bank' }).userMessage
  }
}
</script>
