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
        @update:issuedAmount="(v) => (issuedAmount = v)"
        @update:isStakeInvalid="(v) => (isStakeInvalid = v)"
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

const memberInputInternal = ref<{ name: string; address: string }>({ name: '', address: '' })
const state = reactive({
  address: ''
})
const mintErrorMessage = ref<string | null>(null)
const issuedAmount = ref<number | null>(null)
const isStakeInvalid = ref(true)
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

const schema = z.object({
  address: z.string().refine((v) => isAddress(v), { message: 'Invalid address' })
})

const { mutate: mint, isPending: isMintPending } = useIndividualMint()

const isSubmitDisabled = computed(() => isMintPending.value || isStakeInvalid.value)

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
