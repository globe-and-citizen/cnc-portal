<template>
  <UForm
    ref="form"
    :schema="schema"
    :state="state"
    :validate-on="['blur', 'change', 'input']"
    :validate-on-input-delay="0"
    @submit="onSubmit"
  >
    <div class="flex flex-col gap-6">
      <UFormField name="address" label="Recipient">
        <SelectMemberContractsInput
          v-model="state.addressInput"
          data-test="address-input"
          :disabled="props.disabled"
          @selectItem="handleSelectItem"
        />
      </UFormField>

      <MintStakeSection
        :recipientAddress="state.address"
        :hasValidationError="!isStakeValid"
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
        <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
          <UButton
            type="submit"
            :loading="isMintPending"
            :disabled="isSubmitDisabled || archivedDisabled"
            color="primary"
            class="text-center"
            data-test="submit-button"
            label="Issue tokens"
          />
        </TeamArchivedTooltip>
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { isAddress, parseUnits } from 'viem'
import { reactive, ref, computed, watch } from 'vue'
import SelectMemberContractsInput from '@/components/utils/SelectMemberContractsInput.vue'
import MintStakeSection from './MintStakeSection.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import { useIndividualMint } from '@/composables/investor/writes'
import { log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { TOKEN_DECIMALS } from '@/utils/investorMintAllocation'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'
import { type StakeMode, type StakePayload } from '@/types/investor'

const state = reactive({
  addressInput: { name: '', address: '' },
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
  state.addressInput = props.memberInput
  state.address = props.memberInput.address
}

const queryClient = useQueryClient()
const toast = useToast()

const handleSelectItem = (item: {
  name: string
  address: string
  type: 'member' | 'trader-safe' | 'contract'
}) => {
  state.addressInput = { name: item.name, address: item.address }
  state.address = item.address
}

// Every stake rule lives here and reports on `amount`, so `UForm`/`UFormField` render the
// message natively under the Ownership stake field — no manual message wiring.
const stakeSchema = z
  .object({
    amount: z.number(),
    percentage: z.number(),
    stakeMode: z.enum(['add', 'ending'])
  })
  .superRefine((stake, ctx) => {
    const fail = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message })

    // Require user to enter a stake amount
    if (stake.amount === 0 && stake.percentage === 0) {
      fail('Amount must be greater than 0')
      return
    }

    // Sole-holder edge case: recipient already owns 100% of supply. Their ownership
    // stays at 100% regardless of how many tokens are minted, so the % field always
    // computes to 0 and is meaningless — only the issued amount matters.
    if (stakeContext.addMax === 0 && stakeContext.totalSupply > 0) {
      if (!(stake.amount > 0)) fail('Amount must be greater than 0')
      else if (stake.stakeMode === 'ending' && stake.amount <= stakeContext.totalSupply)
        fail('Ending balance must exceed the current balance')
      return
    }

    if (stake.stakeMode === 'ending' && stakeContext.totalSupply <= 0) {
      fail('Ending % is unavailable while supply is 0. Switch to Add mode.')
      return
    }

    if (!(stake.amount > 0)) fail('Amount must be greater than 0')

    if (stake.stakeMode === 'add') {
      if (!(stake.percentage > 0)) fail('Add % must be greater than 0')
      else if (stake.percentage > stakeContext.addMax)
        fail(`Add % must be less than ${formatAmountWithPrecision(stakeContext.addMax, 0, 2)}%`)
    } else {
      if (!(stake.percentage > stakeContext.endingMin))
        fail(
          `Ending % must be greater than ${formatAmountWithPrecision(stakeContext.endingMin, 0, 2)}%`
        )
      else if (stake.percentage >= 100) fail('Ending % must stay below 100%')
    }
  })

const schema = z.object({
  address: z.string().refine((v) => isAddress(v), { message: 'Invalid address' }),
  stake: stakeSchema
})

const { mutate: mint, isPending: isMintPending } = useIndividualMint()

const isStakeValid = computed(() => stakeSchema.safeParse(state.stake).success)

const isSubmitDisabled = computed(
  () => isMintPending.value || !isStakeValid.value || (issuedAmount.value ?? 0) <= 0
)

// The stake fields live in MintStakeSection and reach this form through an emitted
// payload, so they land after the input event UForm validates on. Re-validate whenever
// that payload settles to keep the natively-rendered message in sync.
const form = ref<{ validate: (opts?: Record<string, unknown>) => Promise<unknown> } | null>(null)
watch(
  () => [
    state.stake.amount,
    state.stake.percentage,
    state.stake.stakeMode,
    stakeContext.addMax,
    stakeContext.endingMin,
    stakeContext.totalSupply
  ],
  () => {
    form.value?.validate({ name: 'stake.amount', silent: true }).catch(() => {})
  }
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
