<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="text-base font-extrabold text-[#0f3d2e]">Repay lenders</div>
          <div class="text-sm text-[#7d8e84]">{{ offering.title }}</div>
        </template>

        <UForm ref="formRef" :schema="repaySchema" :state="formState" @submit="onRepay">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5 rounded-xl bg-[#f7faf8] px-4 py-3 text-sm">
              <div class="flex justify-between">
                <span class="text-[#7d8e84]">Treasury balance</span>
                <span class="font-bold text-[#0f3d2e]">
                  <USkeleton v-if="treasuryBalance === null" class="inline-block h-4 w-20" />
                  <span v-else>{{
                    formatOfferingTokenAmount(treasuryBalance, offering.token)
                  }}</span>
                </span>
              </div>
              <USeparator />
              <div class="flex justify-between">
                <span class="text-[#7d8e84]">Total due (principal + interest)</span>
                <span class="font-bold text-[#0f3d2e]">
                  {{ formatOfferingTokenAmount(totalDue, offering.token) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#7d8e84]">Already repaid</span>
                <span class="font-bold text-[#0f3d2e]">
                  {{ formatOfferingTokenAmount(offering.totalRepaid, offering.token) }}
                </span>
              </div>
              <USeparator />
              <div class="flex justify-between">
                <span class="font-semibold text-[#0f3d2e]">Outstanding</span>
                <span class="font-bold text-[#00a86c]">
                  {{ formatOfferingTokenAmount(outstanding, offering.token) }}
                </span>
              </div>
            </div>

            <UFormField label="Amount to repay now" name="amount">
              <UFieldGroup class="w-full">
                <UInput
                  v-model.number="formState.amount"
                  type="number"
                  :min="0"
                  :max="Math.min(outstanding, treasuryBalance ?? 0)"
                  placeholder="0"
                  class="w-full"
                  :disabled="isSubmitting"
                  data-test="repay-amount-input"
                />
                <UInput
                  :model-value="tokenSymbol"
                  readonly
                  class="w-28"
                  aria-label="Offering token"
                  data-test="repay-token-symbol"
                />
              </UFieldGroup>
            </UFormField>

            <UAlert
              v-if="submitError"
              color="error"
              icon="heroicons:exclamation-circle"
              :description="submitError"
              data-test="repay-error"
            />
          </div>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" label="Cancel" :disabled="isSubmitting" @click="closeModal" />
            <UButton
              color="primary"
              :label="isSubmitting ? 'Submitting…' : 'Repay'"
              :loading="isSubmitting"
              :disabled="isSubmitting || !isReady"
              data-test="repay-confirm-button"
              @click="formRef?.submit()"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { formatUnits, isAddress, parseUnits, zeroAddress } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'
import { useToast } from '@nuxt/ui/composables'
import { useBankAddress } from '@/composables/bank/reads'
import { useFixedReturnRepayLenders } from '@/composables/fixedReturn/writes'
import { useErc20BalanceOf } from '@/composables/erc20/reads'
import {
  classifyError,
  decimalsForOfferingToken,
  formatOfferingTokenAmount,
  getOfferingTokenSymbol
} from '@/utils'
import { createRepayAmountSchema, type OfferingSummary } from '@/types'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ offering: OfferingSummary }>()

const bankAddress = useBankAddress()
const toast = useToast()
const queryClient = useQueryClient()

const formRef = ref()
const formState = reactive({ amount: 0 })
const submitError = ref<string | null>(null)

const tokenSymbol = computed(() => getOfferingTokenSymbol(props.offering.token))
const decimals = computed(() => decimalsForOfferingToken(props.offering.token) ?? 6)

const totalDue = computed(
  () => props.offering.raised + props.offering.raised * (props.offering.rate / 100)
)
const outstanding = computed(() => Math.max(0, totalDue.value - props.offering.totalRepaid))
const amountUnits = computed(() => parseUnits(String(formState.amount || 0), decimals.value))

const {
  data: treasuryBalanceRaw,
  error: treasuryBalanceError,
  refetch: refetchTreasuryBalance
} = useErc20BalanceOf(
  computed(() => props.offering.token),
  computed(() => bankAddress.value ?? zeroAddress)
)
const treasuryBalance = computed(() => {
  if (typeof treasuryBalanceRaw.value !== 'bigint') return null
  return Number(formatUnits(treasuryBalanceRaw.value, decimals.value))
})

const isReady = computed(
  () =>
    isAddress(bankAddress.value ?? '') &&
    treasuryBalanceRaw.value !== undefined &&
    !treasuryBalanceError.value
)

const repaySchema = computed(() =>
  createRepayAmountSchema({
    outstanding: outstanding.value,
    treasuryBalance: treasuryBalance.value ?? Infinity,
    tokenSymbol: tokenSymbol.value
  })
)

const repayResult = useFixedReturnRepayLenders()
const isSubmitting = computed(() => repayResult.isPending.value)

function closeModal() {
  open.value = false
}

function onRepay() {
  if (!isReady.value) return
  submitError.value = null

  repayResult.mutate(
    { args: [BigInt(props.offering.id), amountUnits.value] },
    {
      onSuccess: async () => {
        toast.add({
          title: `Repaid ${formatOfferingTokenAmount(formState.amount, props.offering.token)} to lenders`,
          color: 'success'
        })
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
          queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] })
        ])
        refetchTreasuryBalance()
        open.value = false
      },
      onError: (error) => {
        submitError.value = classifyError(error, { contract: 'FixedReturn' }).userMessage
      }
    }
  )
}
</script>
