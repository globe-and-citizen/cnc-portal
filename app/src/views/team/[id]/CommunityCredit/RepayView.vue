<template>
  <div v-if="round" class="flex flex-col gap-5">
    <!-- Back -->
    <button
      type="button"
      class="text-muted hover:text-default flex cursor-pointer items-center gap-2 text-sm"
      @click="goRound"
    >
      <UIcon name="heroicons:arrow-left" class="size-4" />
      Back to round
    </button>

    <!-- Header -->
    <div>
      <div class="flex items-center gap-2.5">
        <h1 class="text-2xl font-bold tracking-tight">Repay — {{ round.name }}</h1>
        <UBadge :color="status.color" variant="subtle" :label="status.label" size="lg" />
      </div>
      <p class="text-muted mt-1.5 text-sm">
        Returns each lender's principal plus {{ round.rate }}% interest, distributed on-chain in one
        transaction from your connected wallet.
      </p>
    </div>

    <div class="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
      <!-- Breakdown -->
      <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
        <div class="border-default flex items-center justify-between border-b px-6 py-4">
          <span class="text-base font-semibold">Repayment breakdown</span>
          <UBadge color="primary" variant="subtle" :label="`${rows.length} lenders`" />
        </div>
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-muted text-muted text-left text-xs font-semibold">
              <th class="px-4 py-3">Lender</th>
              <th class="px-4 py-3 text-right">Principal</th>
              <th class="px-4 py-3 text-right">Interest</th>
              <th class="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lender in rows"
              :key="lender.addr"
              class="border-default/60 border-t"
              :class="{ 'bg-primary/5': lender.you }"
            >
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-2.5">
                  <CreditAvatar :name="lender.name" :gradient="lender.gradient" :size="30" />
                  <div>
                    <div class="font-semibold">{{ lender.name }}</div>
                    <div class="text-muted font-mono text-[11px]">{{ lender.addr }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5 text-right">{{ formatAmount(lender.amount, round.token) }}</td>
              <td class="text-primary px-4 py-3.5 text-right font-semibold">
                + {{ formatAmount(lender.interest, round.token) }}
              </td>
              <td class="px-4 py-3.5 text-right font-bold">
                {{ formatAmount(lender.total, round.token) }}
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="4" class="text-muted px-4 py-6 text-center text-sm">
                No lenders have funded this round.
              </td>
            </tr>
          </tbody>
        </table>
        <div class="border-default bg-muted flex items-center justify-between border-t px-6 py-4">
          <span class="text-muted text-sm font-semibold">Grand total</span>
          <span class="text-xl font-extrabold tracking-tight">
            {{ formatAmount(grandTotal, round.token) }}
          </span>
        </div>
      </div>

      <!-- Confirm -->
      <div class="flex flex-col gap-4">
        <div
          class="border-primary/20 from-primary/5 to-default rounded-2xl border bg-gradient-to-br p-6 shadow-sm"
        >
          <div class="text-muted text-sm">Total to repay</div>
          <div class="mt-1.5 text-[34px] font-extrabold tracking-tight">
            {{ formatAmount(grandTotal, round.token) }}
          </div>
          <div class="text-muted mt-1 text-xs">
            {{ formatAmount(principalTotal, round.token) }} principal +
            {{ formatAmount(interestTotal, round.token) }} interest
          </div>
        </div>

        <UAlert
          color="info"
          variant="soft"
          icon="heroicons:shield-check"
          title="On-chain repayment"
          description="Signing approves the token, then distributes principal + interest to every lender in one transaction."
        />

        <UAlert
          v-if="submitError"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :description="submitError"
          data-test="repay-error"
        />

        <UButton
          color="primary"
          size="xl"
          block
          icon="heroicons:check-circle"
          :label="isSubmitting ? 'Signing…' : 'Repay all lenders · sign'"
          :loading="isSubmitting"
          :disabled="isSubmitting || grandTotal <= 0"
          data-test="confirm-repay"
          @click="confirmRepay"
        />
        <UButton
          variant="ghost"
          color="neutral"
          block
          label="Cancel"
          :disabled="isSubmitting"
          @click="goRound"
        />
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
import { parseUnits, zeroAddress, type Address } from 'viem'
import { useCommunityCreditStore, useUserDataStore } from '@/stores'
import {
  useFixedReturnAddress,
  useFixedReturnGetLendingOffer,
  useFixedReturnOfferLenders
} from '@/composables/fixedReturn/reads'
import { useFixedReturnRepayLenders } from '@/composables/fixedReturn/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { useERC20Approve } from '@/composables/erc20/writes'
import {
  classifyError,
  decimalsForOfferingToken,
  formatAmount,
  offerLenderToCreditLender,
  resolveUser,
  statusMeta
} from '@/utils'
import type { LendingOfferStruct } from '@/types'
import CreditAvatar from '@/components/sections/CommunityCreditView/CreditAvatar.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const queryClient = useQueryClient()
const store = useCommunityCreditStore()
const userStore = useUserDataStore()
const fixedReturnAddress = useFixedReturnAddress()

const teamId = computed(() => String(route.params.id))
const roundId = computed(() => String(route.params.roundId))
const offerId = computed(() => BigInt(roundId.value || '0'))

const round = computed(() => store.getRound(roundId.value))
const status = computed(() => statusMeta(round.value?.status ?? 'active'))

const { data: rawOffer } = useFixedReturnGetLendingOffer(offerId)
const offer = computed(() => rawOffer.value as LendingOfferStruct | undefined)
const tokenAddress = computed(() => offer.value?.token ?? zeroAddress)
const decimals = computed(() =>
  offer.value ? (decimalsForOfferingToken(offer.value.token) ?? 6) : 6
)
const { data: lenderData } = useFixedReturnOfferLenders(roundId, tokenAddress)

const rows = computed(() =>
  (lenderData.value ?? []).map((lender) => {
    const base = offerLenderToCreditLender(
      lender,
      (address) => resolveUser(address).name,
      userStore.address
    )
    return { ...base, interest: lender.expected - lender.principal, total: lender.expected }
  })
)
const principalTotal = computed(() =>
  (lenderData.value ?? []).reduce((sum, lender) => sum + lender.principal, 0)
)
const grandTotal = computed(() =>
  (lenderData.value ?? []).reduce((sum, lender) => sum + lender.expected, 0)
)
const interestTotal = computed(() => grandTotal.value - principalTotal.value)

const amountUnits = computed(() =>
  parseUnits(grandTotal.value.toFixed(decimals.value), decimals.value)
)

const { data: allowance, refetch: refetchAllowance } = useErc20Allowance(
  tokenAddress,
  computed(() => (userStore.address as Address) ?? zeroAddress),
  computed(() => fixedReturnAddress.value ?? zeroAddress)
)
const allowanceValue = computed(() => (typeof allowance.value === 'bigint' ? allowance.value : 0n))

const approveResult = useERC20Approve(computed(() => tokenAddress.value))
const repayResult = useFixedReturnRepayLenders()
const isSubmitting = computed(() => approveResult.isPending.value || repayResult.isPending.value)
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
  if (!fixedReturnAddress.value || grandTotal.value <= 0) return
  submitError.value = null

  try {
    await refetchAllowance()
    if (allowanceValue.value < amountUnits.value) {
      await approveResult.mutateAsync({ args: [fixedReturnAddress.value, amountUnits.value] })
    }
    await repayResult.mutateAsync({ args: [offerId.value, amountUnits.value] })
    toast.add({ title: 'Round repaid — principal + interest returned', color: 'success' })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
      queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] }),
      queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] })
    ])
    goRound()
  } catch (error) {
    submitError.value = classifyError(error, { contract: 'FixedReturn' }).userMessage
  }
}
</script>
