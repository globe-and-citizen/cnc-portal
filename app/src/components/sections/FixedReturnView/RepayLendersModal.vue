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
                <span class="text-[#7d8e84]">Contract balance</span>
                <span class="font-bold text-[#0f3d2e]">
                  <USkeleton v-if="contractBalance === null" class="inline-block h-4 w-20" />
                  <span v-else>{{
                    formatOfferingTokenAmount(contractBalance, offering.token)
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
            <UButton
              variant="ghost"
              label="Cancel"
              :disabled="isSubmitting"
              @click="open = false"
            />
            <UButton
              color="primary"
              :label="isSubmitting ? 'Submitting…' : 'Repay'"
              :loading="isSubmitting"
              :disabled="isSubmitting"
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
import { formatUnits, parseUnits, zeroAddress, type Address } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'
import { useToast } from '@nuxt/ui/composables'
import { useUserDataStore } from '@/stores'
import { useFixedReturnAddress } from '@/composables/fixedReturn/reads'
import { useFixedReturnRepayLenders } from '@/composables/fixedReturn/writes'
import { useErc20Allowance, useErc20BalanceOf } from '@/composables/erc20/reads'
import { useERC20Approve } from '@/composables/erc20/writes'
import {
  classifyError,
  decimalsForOfferingToken,
  formatOfferingTokenAmount,
  getOfferingTokenSymbol
} from '@/utils'
import { createRepayAmountSchema, type OfferingSummary } from '@/types'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ offering: OfferingSummary }>()

const userStore = useUserDataStore()
const fixedReturnAddress = useFixedReturnAddress()
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
const repaySchema = computed(() => createRepayAmountSchema(outstanding.value, tokenSymbol.value))
const amountUnits = computed(() => parseUnits(String(formState.amount || 0), decimals.value))

const { data: contractBalanceRaw } = useErc20BalanceOf(
  computed(() => props.offering.token),
  computed(() => fixedReturnAddress.value ?? zeroAddress)
)
const contractBalance = computed(() => {
  if (typeof contractBalanceRaw.value !== 'bigint') return null
  return Number(formatUnits(contractBalanceRaw.value, decimals.value))
})

const { data: allowance, refetch: refetchAllowance } = useErc20Allowance(
  computed(() => props.offering.token),
  computed(() => (userStore.address as Address) ?? zeroAddress),
  computed(() => fixedReturnAddress.value ?? zeroAddress)
)
const allowanceValue = computed(() => (typeof allowance.value === 'bigint' ? allowance.value : 0n))

const approveResult = useERC20Approve(computed(() => props.offering.token))
const repayResult = useFixedReturnRepayLenders()

const isSubmitting = computed(() => approveResult.isPending.value || repayResult.isPending.value)

async function onRepay() {
  if (!fixedReturnAddress.value) return
  submitError.value = null

  try {
    await refetchAllowance()
    if (allowanceValue.value < amountUnits.value) {
      await approveResult.mutateAsync({ args: [fixedReturnAddress.value, amountUnits.value] })
    }
    await repayResult.mutateAsync({ args: [BigInt(props.offering.id), amountUnits.value] })

    toast.add({
      title: `Repaid ${formatOfferingTokenAmount(formState.amount, props.offering.token)} to lenders`,
      color: 'success'
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] }),
      queryClient.invalidateQueries({ queryKey: ['fixedReturnOfferLenders'] })
    ])
    open.value = false
  } catch (error) {
    submitError.value = classifyError(error, { contract: 'FixedReturn' }).userMessage
  }
}
</script>
