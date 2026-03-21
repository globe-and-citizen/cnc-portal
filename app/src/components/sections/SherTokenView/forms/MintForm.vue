<template>
  <div class="flex flex-col gap-4">
    <h2>Mint {{ tokenSymbol }}</h2>

    <h3>Please input the {{ input.address ? '' : 'address and ' }}amount to mint</h3>
    <div>
      <SelectMemberContractsInput
        v-model="input"
        data-test="address-input"
        :disabled="props.disabled"
      />
      <div
        v-if="addressError"
        class="pl-4 text-red-500 text-sm w-full text-left"
        data-test="error-address-input"
      >
        {{ addressError }}
      </div>
    </div>

    <UFormField label="Amount" name="amount" :error="amountError" class="w-full">
      <div class="relative">
        <UInput
          type="number"
          v-model="amount"
          data-test="amount-input"
          class="w-full"
        />
        <span
          class="absolute right-4 top-1/2 transform -translate-y-1/2 text-black font-bold text-sm"
        >
          {{ tokenSymbol }}
        </span>
      </div>
    </UFormField>

    <div class="text-center flex gap-4 justify-between" data-test="form-actions">
      <UButton
        color="error"
        variant="outline"
        data-test="cancel-button"
        :disabled="isConfirmingMint || isMintPending"
        @click="() => emit('close-modal')"
        >Cancel
      </UButton>
      <UButton
        :loading="isConfirmingMint || isMintPending || !isFormValid"
        :disabled="isConfirmingMint || isMintPending || !isFormValid"
        color="primary"
        class="w-44 text-center"
        @click="onSubmit()"
        data-test="submit-button"
        >Mint {{ tokenSymbol }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { isAddress, parseUnits, type Address } from 'viem'
import { onMounted, ref } from 'vue'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import SelectMemberContractsInput from '@/components/utils/SelectMemberContractsInput.vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { computed, watch } from 'vue'
import { useTeamStore, useToastStore } from '@/stores'
import { log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'

const amount = ref<number | null>(null)
const input = ref<{ name: string; address: string }>({
  name: '',
  address: ''
})
const emit = defineEmits(['close-modal'])

const mintModal = defineModel({ default: false })
const props = defineProps<{
  memberInput?: { name: string; address: string }
  disabled?: boolean
}>()

const queryClient = useQueryClient()
const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))

const {
  data: mintHash,
  mutate: mint,
  error: mintError,
  isPending: isMintPending
} = useWriteContract()

const { isLoading: isConfirmingMint, isSuccess: isSuccessMinting } = useWaitForTransactionReceipt({
  hash: mintHash
})

const { data: tokenSymbol, error: tokenSymbolError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const mintSchema = z.object({
  address: z
    .string({ message: 'Address is required' })
    .min(1, 'Address is required')
    .refine((val) => isAddress(val), { message: 'Invalid address' }),
  amount: z.coerce
    .number({ message: 'Amount is required' })
    .positive('Amount must be greater than 0')
})

const submitted = ref(false)
const addressError = ref<string | undefined>()
const amountError = ref<string | undefined>()

const validationResult = computed(() =>
  mintSchema.safeParse({ address: input.value.address, amount: amount.value })
)
const isFormValid = computed(() => validationResult.value.success)

const validate = () => {
  const result = validationResult.value
  if (result.success) {
    addressError.value = undefined
    amountError.value = undefined
    return true
  }
  const fieldErrors = result.error.flatten().fieldErrors
  addressError.value = fieldErrors.address?.[0]
  amountError.value = fieldErrors.amount?.[0]
  return false
}

const onSubmit = () => {
  submitted.value = true
  if (!validate()) return
  mint({
    abi: INVESTOR_ABI,
    address: investorsAddress.value as Address,
    functionName: 'individualMint',
    args: [input.value.address as Address, parseUnits(amount.value!.toString(), 6)]
  })
}

onMounted(() => {
  if (props.memberInput) {
    input.value = props.memberInput
  }
})

watch(isConfirmingMint, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isSuccessMinting.value) {
    addSuccessToast('Minted successfully')
    await queryClient.invalidateQueries({
      queryKey: ['readContract']
    })

    mintModal.value = false
    // reset()
    emit('close-modal')
  }
})

watch(mintError, (value) => {
  if (value) {
    log.error('Failed to mint', value)
    addErrorToast('Failed to mint')
  }
})

watch(tokenSymbolError, (value) => {
  if (value) {
    log.error('Error fetching token symbol', value)
    addErrorToast('Error fetching token symbol')
  }
})
</script>
