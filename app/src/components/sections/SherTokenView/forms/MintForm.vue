<template>
  <UForm
    :schema="schema"
    :state="state"
    :validate-on="['blur', 'change', 'input']"
    @submit="onSubmit"
  >
    <div class="flex flex-col gap-6">
      <UFormField name="address" label="Recipient">
        <SelectMemberContractsInput
          :modelValue="memberInputInternal"
          @update:modelValue="
            (v) => {
              memberInputInternal = v
              state.address = v.address
            }
          "
          data-test="address-input"
          :disabled="props.disabled"
        />
      </UFormField>

      <MintStakeSection
        :recipientAddress="state.address"
        :stakeValidationMessage="stakeValidationMessage"
        @update:issuedAmount="(v) => (issuedAmount = v)"
        @update:stakePayload="onStakePayloadUpdate"
      />

      <UAlert
        v-if="mintErrorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="mintErrorMessage"
      />

      <div class="flex justify-between gap-4 text-center" data-test="form-actions">
        <UButton
          variant="outline"
          color="error"
          data-test="cancel-button"
          :disabled="isMintPending"
          @click="emit('close-modal')"
          label="Cancel"
        />
        <UButton
          type="submit"
          :loading="isMintPending"
          :disabled="isSubmitDisabled"
          color="primary"
          class="text-center"
          data-test="submit-button"
          label="Issue tokens"
        />
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { isAddress, parseUnits } from 'viem'
import { reactive, ref, computed } from 'vue'
import SelectMemberContractsInput from '@/components/utils/SelectMemberContractsInput.vue'
import MintStakeSection from './MintStakeSection.vue'
import { useIndividualMint } from '@/composables/investor/writes'
import { log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { TOKEN_DECIMALS } from '@/utils/investorMintAllocation'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'
import { type StakeMode, type StakePayload } from '@/types/investor'

const memberInputInternal = ref<{ name: string; address: string }>({ name: '', address: '' })
const state = reactive({
  address: '',
  stake: {
    amount: 0,
    percentage: 0,
    stakeMode: 'ending' as StakeMode
  }
})
const mintErrorMessage = ref<string | null>(null)
const issuedAmount = ref<number | null>(null)
const stakeContext = reactive({
  addMax: 100,
  endingMin: 0,
  totalSupply: 0
})
const emit = defineEmits(['close-modal'])

const props = defineProps<{
  memberInput?: { name: string; address: string }
  disabled?: boolean
}>()

if (props.memberInput) {
  memberInputInternal.value = props.memberInput
  state.address = props.memberInput.address
}

const queryClient = useQueryClient()
const toast = useToast()

const schema = computed(() =>
  z.object({
    address: z.string().refine((v) => isAddress(v), { message: 'Invalid address' }),
    stake: z.object({
      amount: z
        .number()
        .positive('Amount must be greater than 0')
        .refine((v) => v !== 0, { message: 'Amount cannot be zero' }),
      percentage:
        state.stake.stakeMode === 'add'
          ? z
              .number()
              .positive('Add % must be greater than 0')
              .max(
                stakeContext.addMax,
                `Add % must be less than ${formatAmountWithPrecision(stakeContext.addMax, 0, 2)}%`
              )
          : z
              .number()
              .gt(
                stakeContext.endingMin,
                `Ending % must be greater than ${formatAmountWithPrecision(stakeContext.endingMin, 0, 2)}%`
              )
              .lt(100, 'Ending % must stay below 100%'),
      stakeMode: z.enum(['add', 'ending'])
    })
  })
)

const { mutate: mint, isPending: isMintPending } = useIndividualMint()

const stakeValidationMessage = computed(() => {
  if (state.stake.amount === 0 && state.stake.percentage === 0) return null

  if (state.stake.stakeMode === 'ending' && stakeContext.totalSupply <= 0) {
    return 'Ending % is unavailable while supply is 0. Switch to Add mode.'
  }

  const result = schema.value.safeParse(state)
  if (result.success) return null
  const stakeIssue = result.error.issues.find((issue) => issue.path[0] === 'stake')
  return stakeIssue?.message ?? null
})

const isSubmitDisabled = computed(
  () => isMintPending.value || !!stakeValidationMessage.value || (issuedAmount.value ?? 0) <= 0
)

const onStakePayloadUpdate = (payload: StakePayload) => {
  state.stake.amount = payload.amount
  state.stake.percentage = payload.percentage
  state.stake.stakeMode = payload.stakeMode
  stakeContext.addMax = payload.addMax
  stakeContext.endingMin = payload.endingMin
  stakeContext.totalSupply = payload.totalSupply
}

const onSubmit = () => {
  if (issuedAmount.value === null || issuedAmount.value <= 0 || !isAddress(state.address)) return

  mintErrorMessage.value = null
  mint(
    { args: [state.address, parseUnits(String(issuedAmount.value), TOKEN_DECIMALS)] },
    {
      onSuccess: async () => {
        toast.add({ title: 'Tokens issued successfully', color: 'success' })
        await queryClient.invalidateQueries({ queryKey: ['readContract'] })
        emit('close-modal')
      },
      onError: (error) => {
        log.error('Failed to mint', error)
        mintErrorMessage.value =
          (error as { shortMessage?: string }).shortMessage ??
          error.message ??
          'Transaction failed. Please try again.'
      }
    }
  )
}
</script>
