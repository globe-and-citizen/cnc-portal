<template>
  <UModal
    v-model:open="open"
    :title="offer.title"
    :close="closeButton"
    :ui="{
      overlay: 'bg-[rgba(8,32,24,0.45)]',
      content: 'max-w-md overflow-hidden shadow-[0_24px_60px_rgba(8,32,24,0.35)]',
      header: 'items-start px-7 py-5',
      body: 'flex flex-col gap-5 px-7 py-5'
    }"
    @after:leave="emit('after:leave')"
  >
    <template #title>
      <div>
        <div class="text-xs font-bold tracking-widest text-[#00a86c] uppercase">Apply to lend</div>
        <div class="mt-1 text-lg font-extrabold text-[#0f3d2e]">
          {{ offer.title }}
        </div>
      </div>
    </template>

    <template #body>
      <UForm :schema="amountSchema" :state="formState" class="contents" @submit="submit">
        <div class="grid grid-cols-3 gap-2.5">
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Rate</div>
            <div class="mt-0.5 text-sm font-bold text-[#00a86c]">{{ offer.rate }}% / yr</div>
          </div>
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Term</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">{{ offer.term }} mo</div>
          </div>
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Repayment</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">Bullet</div>
          </div>
        </div>

        <div>
          <UFormField
            name="amount"
            label="Amount to lend"
            :help="offer.cap == null ? limitsHint : undefined"
            :error="modalError"
          >
            <UFieldGroup class="w-full">
              <UInput
                v-model.number="formState.amount"
                type="number"
                class="w-full"
                data-test="apply-offering-amount-input"
              />
              <UInput
                :model-value="selectedTokenSymbol"
                readonly
                class="w-28"
                aria-label="Offering token"
                data-test="apply-offering-token-symbol"
              />
            </UFieldGroup>
          </UFormField>
          <p
            v-if="offer.cap != null"
            class="mt-1.5 text-xs text-[#7d8e84]"
            data-test="apply-offering-remaining"
          >
            Remaining to lend:
            <span class="font-semibold">
              {{ formatOfferingTokenAmount(offer.remaining, offer.token) }}
            </span>
          </p>
        </div>

        <div class="rounded-xl bg-[#0f3d2e] px-5 py-4 text-white">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs text-[#8fc3ad]">You receive at maturity</span>
            <span class="text-xl font-extrabold">
              {{ formatOfferingTokenAmount(applyTotal, offer.token) }}
            </span>
          </div>
          <div class="flex justify-between text-xs text-[#a9c9bd]">
            <span>Principal {{ formatOfferingTokenAmount(formState.amount, offer.token) }}</span>
            <span class="font-bold text-[#7fd9b6]">
              + {{ formatOfferingTokenAmount(applyInterest, offer.token) }} interest
            </span>
          </div>
        </div>

        <UButton
          type="submit"
          block
          size="lg"
          color="primary"
          :label="isSubmitting ? 'Submitting…' : 'Submit application'"
          :loading="isSubmitting"
          :disabled="!!modalError || isSubmitting"
          data-test="apply-offering-submit-button"
        />
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { parseUnits, zeroAddress, type Address } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import { useUserDataStore } from '@/stores'
import { useFixedReturnAddress } from '@/composables/fixedReturn/reads'
import { useFixedReturnLendFunds } from '@/composables/fixedReturn/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { useERC20Approve } from '@/composables/erc20/writes'
import {
  classifyError,
  decimalsForOfferingToken,
  expectedReturn,
  formatOfferingTokenAmount,
  getLenderOfferingLimitsHint,
  getOfferingTokenSymbol
} from '@/utils'
import { createApplyOfferingAmountSchema, type LenderOffering } from '@/types'

const props = defineProps<{ offer: LenderOffering }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ 'after:leave': [] }>()

const userStore = useUserDataStore()
const fixedReturnAddress = useFixedReturnAddress()
const toast = useToast()
const queryClient = useQueryClient()

const formState = reactive({ amount: 0 })
const submitError = ref<string | null>(null)
const closeButton = {
  size: 'sm' as const,
  'data-test': 'apply-offering-close-button'
}

const applyTotal = computed(() => expectedReturn(formState.amount, props.offer.rate))
const applyInterest = computed(() => applyTotal.value - formState.amount)
const selectedTokenSymbol = computed(() => getOfferingTokenSymbol(props.offer.token))

const amountSchema = computed(() => {
  return createApplyOfferingAmountSchema(props.offer.remaining, selectedTokenSymbol.value)
})

const amountError = computed(() => {
  const result = amountSchema.value.safeParse(formState)
  return result.success ? '' : (result.error.issues[0]?.message ?? '')
})

const modalError = computed(() => amountError.value || submitError.value || '')

const limitsHint = computed(() => getLenderOfferingLimitsHint(props.offer))

const selectedDecimals = computed(() => decimalsForOfferingToken(props.offer.token) ?? 6)
const applyAmountUnits = computed(() =>
  parseUnits(String(formState.amount || 0), selectedDecimals.value)
)

const { data: allowance, refetch: refetchAllowance } = useErc20Allowance(
  computed(() => props.offer.token),
  computed(() => (userStore.address as Address) ?? zeroAddress),
  computed(() => fixedReturnAddress.value ?? zeroAddress)
)
const allowanceValue = computed(() => (typeof allowance.value === 'bigint' ? allowance.value : 0n))

const approveTokenResult = useERC20Approve(computed(() => props.offer.token))
const lendFundsResult = useFixedReturnLendFunds()

const isSubmitting = computed(
  () => approveTokenResult.isPending.value || lendFundsResult.isPending.value
)

async function submit() {
  if (!fixedReturnAddress.value) return
  submitError.value = null

  const amountUnits = applyAmountUnits.value

  try {
    await refetchAllowance()
    if (allowanceValue.value < amountUnits) {
      await approveTokenResult.mutateAsync({ args: [fixedReturnAddress.value, amountUnits] })
    }
    await lendFundsResult.mutateAsync({ args: [BigInt(props.offer.id), amountUnits] })

    toast.add({
      title: `You lent ${formatOfferingTokenAmount(formState.amount, props.offer.token)} to ${props.offer.title}`,
      color: 'success'
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
      queryClient.invalidateQueries({ queryKey: ['fixedReturnMyLenderPositions'] })
    ])
    open.value = false
  } catch (error) {
    submitError.value = classifyError(error, { contract: 'FixedReturn' }).userMessage
  }
}
</script>
