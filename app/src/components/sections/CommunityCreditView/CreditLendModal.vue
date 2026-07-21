<template>
  <Teleport to="body">
    <div
      v-if="round"
      class="fixed inset-0 z-50 flex items-center justify-center p-5"
      style="background: rgba(8, 32, 24, 0.45)"
      data-test="credit-lend-modal"
      @click="emit('close')"
    >
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-lend-title"
        tabindex="-1"
        class="bg-default w-full max-w-md overflow-hidden rounded-2xl"
        style="box-shadow: 0 24px 60px rgba(8, 32, 24, 0.35)"
        @click.stop
      >
        <!-- Header -->
        <div class="border-default border-b px-6 py-4.5">
          <h2 id="credit-lend-title" class="text-lg font-semibold">Lend to {{ round.name }}</h2>
          <p class="text-muted mt-1 text-sm">{{ subtitle }}</p>
        </div>

        <div class="flex flex-col gap-4.5 px-6 py-5">
          <!-- Remaining + cap tiles -->
          <div class="flex gap-2.5">
            <div class="bg-muted flex-1 rounded-xl px-3.5 py-3">
              <div class="text-muted text-[11px] font-semibold">Remaining</div>
              <div class="mt-0.5 text-base font-bold" data-test="lend-remaining">
                {{ formatAmount(displayRemaining, round.token, 4) }}
              </div>
            </div>
            <div class="bg-muted flex-1 rounded-xl px-3.5 py-3">
              <div class="text-muted text-[11px] font-semibold">{{ capLabel }}</div>
              <div class="mt-0.5 text-base font-bold" data-test="lend-cap">{{ capValue }}</div>
            </div>
          </div>

          <!-- Amount input -->
          <div>
            <label class="mb-1.5 block text-sm font-medium" for="credit-lend-amount">
              Your contribution
            </label>
            <UInput
              id="credit-lend-amount"
              v-model="amount"
              type="number"
              min="0"
              placeholder="0"
              size="xl"
              class="w-full text-lg font-bold"
              data-test="lend-amount-input"
            >
              <template #trailing>
                <span class="text-muted text-sm font-bold">{{ round.token }}</span>
              </template>
            </UInput>
            <div class="mt-2.5 flex gap-1.5">
              <UButton
                v-for="q in quick"
                :key="q.label"
                variant="outline"
                color="neutral"
                size="xs"
                :label="q.label"
                class="flex-1 justify-center"
                :data-test="`lend-quick-${q.label}`"
                @click="amount = String(q.value)"
              />
            </div>
          </div>

          <!-- Projected return -->
          <div
            class="border-primary/20 from-primary/5 to-default rounded-xl border bg-gradient-to-br p-4"
          >
            <div class="text-primary mb-2.5 text-xs font-semibold">Your projected return</div>
            <div class="flex flex-col gap-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted">You lend</span>
                <span class="font-semibold">{{ formatAmount(numericAmount, round.token, 4) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Interest · {{ round.rate }}%</span>
                <span class="text-primary font-semibold"
                  >+ {{ formatAmount(interest, round.token, 4) }}</span
                >
              </div>
              <div
                class="border-primary/20 flex items-baseline justify-between border-t border-dashed pt-2.5"
              >
                <span class="text-sm font-semibold">You receive at maturity</span>
                <span class="text-xl font-extrabold">{{
                  formatAmount(total, round.token, 4)
                }}</span>
              </div>
            </div>
            <div class="text-muted mt-2 text-[11px]">{{ maturityNote }}</div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="submitError" class="px-6">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :description="submitError"
            data-test="lend-error"
          />
        </div>

        <!-- Footer -->
        <div class="border-default flex justify-end gap-2 border-t px-6 py-3.5">
          <UButton
            variant="ghost"
            color="neutral"
            label="Cancel"
            :disabled="isSubmitting"
            @click="emit('close')"
          />
          <UButton
            color="primary"
            icon="heroicons:hand-raised"
            :label="isSubmitting ? 'Signing…' : confirmLabel"
            :loading="isSubmitting"
            :disabled="numericAmount <= 0 || isSubmitting"
            data-test="lend-confirm"
            @click="confirm"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { parseUnits, zeroAddress, type Address } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import { useUserDataStore } from '@/stores'
import {
  useFixedReturnAddress,
  useFixedReturnGetLendingOffer,
  useFixedReturnMyLenderPositions
} from '@/composables/fixedReturn/reads'
import { useFixedReturnLendFunds } from '@/composables/fixedReturn/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { useERC20Approve } from '@/composables/erc20/writes'
import {
  classifyError,
  findCreditToken,
  formatAmount,
  roundToDisplayPrecision,
  toLenderOffering,
  UNCAPPED_ALLOCATION
} from '@/utils'
import type { CreditRound, LendingOfferStruct } from '@/types'

const props = defineProps<{ round: CreditRound | null }>()
const emit = defineEmits<{ close: []; lent: [] }>()

const userStore = useUserDataStore()
const fixedReturnAddress = useFixedReturnAddress()
const toast = useToast()
const queryClient = useQueryClient()

const amount = ref('')
const submitError = ref<string | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const numericAmount = computed(() => Math.max(0, Number(amount.value) || 0))
const remaining = computed(() => (props.round ? props.round.target - props.round.raised : 0))

// CreditRound.token is a symbol; resolve it to the on-chain token to scale amounts and
// approve/lend against. FixedReturn is ERC20-only, so an unknown symbol means we can't lend.
const token = computed(() => (props.round ? findCreditToken(props.round.token) : undefined))
const decimals = computed(() => token.value?.decimals ?? 6)
const amountUnits = computed(() => parseUnits(String(numericAmount.value || 0), decimals.value))

const { data: allowance, refetch: refetchAllowance } = useErc20Allowance(
  computed(() => (token.value?.address as Address) ?? zeroAddress),
  computed(() => (userStore.address as Address) ?? zeroAddress),
  computed(() => fixedReturnAddress.value ?? zeroAddress)
)
const allowanceValue = computed(() => (typeof allowance.value === 'bigint' ? allowance.value : 0n))

const approveResult = useERC20Approve(computed(() => token.value?.address as Address | undefined))
const lendResult = useFixedReturnLendFunds()
const isSubmitting = computed(() => approveResult.isPending.value || lendResult.isPending.value)

// The round prop's own `cap`/`lenders` fields are unreliable for "my" position: `cap` only
// ever reflects the General-mode lenderCap (FixedReturn.sol docs it as "General mode only"),
// never a whitelist allocation, and `lenders` is empty when opened from the Index list (see
// lendingOfferToCreditRound's comment — lenders are "resolved lazily by the detail view").
// Read the live per-lender position the same way the Lender Marketplace does instead.
const offerId = computed(() => (props.round ? BigInt(props.round.id) : 0n))
const { data: rawOffer } = useFixedReturnGetLendingOffer(offerId)
const { data: myLenderPositions } = useFixedReturnMyLenderPositions()

const lenderOffering = computed(() => {
  if (!props.round || !rawOffer.value) return null
  const position = myLenderPositions.value?.get(Number(props.round.id)) ?? {
    allocation: 0n,
    deposited: 0n
  }
  const offering = toLenderOffering(
    Number(props.round.id),
    rawOffer.value as LendingOfferStruct,
    decimals.value,
    position.allocation,
    position.deposited
  )
  // toLenderOffering formatUnits-es the raw allocation as-is — for an uncapped whitelist
  // lender that's UNCAPPED_ALLOCATION (near-max uint256), which would otherwise render
  // as a nonsensical giant "cap" figure. Treat it exactly like no personal cap.
  return position.allocation === UNCAPPED_ALLOCATION ? { ...offering, cap: null } : offering
})

/** Personal ceiling left — whitelist allocation or general cap, whichever the offer uses. */
const capLeft = computed(() => {
  const offering = lenderOffering.value
  return offering?.cap != null ? Math.max(0, offering.cap - offering.myDeposited) : null
})

// The "Remaining" tile mirrors the Lender Marketplace's single "remaining" figure — the
// tighter of the round's funding gap and the lender's own cap/allocation left — not just
// the funding-level gap, which can overstate what this lender can actually still lend.
const displayRemaining = computed(() => lenderOffering.value?.remaining ?? remaining.value)

const subtitle = computed(() =>
  props.round
    ? `${props.round.rate}% interest · repaid ${props.round.maturity || 'at maturity'}`
    : ''
)
const capLabel = computed(() =>
  lenderOffering.value?.cap != null ? 'Your cap left' : 'Per-lender cap'
)
const capValue = computed(() =>
  lenderOffering.value?.cap != null
    ? formatAmount(capLeft.value ?? 0, props.round?.token, 4)
    : 'No cap'
)

const interest = computed(() => (props.round ? (numericAmount.value * props.round.rate) / 100 : 0))
const total = computed(() => numericAmount.value + interest.value)

const quick = computed(() => {
  // `max` is already the tighter of the round's remaining funding gap and the lender's
  // own remaining allocation/cap (see `toLenderOffering`). 25%/50% are fractions of that
  // same actionable ceiling — not of the round-level gap clamped down afterward, which
  // collapsed all three presets to the same value whenever the personal cap was the
  // binding constraint (e.g. a $500 allocation on a $10,000 round: 25%/50% of the
  // $10,000 gap both clamp to $500, same as Max).
  const max = lenderOffering.value?.remaining ?? remaining.value
  return [
    { label: '25%', value: roundToDisplayPrecision(max * 0.25) },
    { label: '50%', value: roundToDisplayPrecision(max * 0.5) },
    { label: 'Max', value: max }
  ]
})

const maturityNote = computed(() =>
  props.round
    ? `Capital and interest returned ${props.round.maturity ? 'on ' + props.round.maturity : 'at maturity'}.`
    : ''
)

const confirmLabel = computed(() =>
  props.round && numericAmount.value > 0
    ? `Sign & lend ${formatAmount(numericAmount.value, props.round.token, 4)}`
    : 'Sign & lend'
)

async function confirm() {
  const round = props.round
  if (!round || numericAmount.value <= 0) return
  submitError.value = null

  if (!fixedReturnAddress.value) {
    submitError.value = 'No Credit Account is deployed for this team.'
    return
  }
  if (!token.value) {
    submitError.value = `Unsupported token: ${round.token}`
    return
  }

  try {
    await refetchAllowance()
    if (allowanceValue.value < amountUnits.value) {
      await approveResult.mutateAsync({ args: [fixedReturnAddress.value, amountUnits.value] })
    }
    await lendResult.mutateAsync({ args: [BigInt(round.id), amountUnits.value] })
    toast.add({
      title: `Credit signed — ${formatAmount(numericAmount.value, round.token, 4)} sent`,
      color: 'success'
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
      queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] }),
      queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] })
    ])
    emit('lent')
  } catch (error) {
    submitError.value = classifyError(error, { contract: 'FixedReturn' }).userMessage
  }
}

// Reset the field and focus the panel each time a different round opens.
watch(
  () => props.round?.id,
  (id) => {
    if (!id) return
    amount.value = ''
    submitError.value = null
    nextTick(() => panelRef.value?.focus())
  },
  { immediate: true }
)
</script>
