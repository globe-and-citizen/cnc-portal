<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit">
    <div class="flex flex-col gap-4">
      <h2>Mint {{ tokenSymbol }}</h2>

      <h3>Please input the {{ state.address ? '' : 'address and ' }}amount to mint</h3>

      <UFormField name="address">
        <SelectMemberContractsInput
          :modelValue="memberInputInternal"
          @update:modelValue="handleMemberInput"
          data-test="address-input"
          :disabled="props.disabled"
        />
      </UFormField>

      <UFormField name="amount" label="Amount">
        <div class="relative">
          <UInput
            type="number"
            class="w-full pr-16"
            data-test="amount-input"
            v-model="state.amount"
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
          variant="outline"
          color="error"
          data-test="cancel-button"
          :disabled="isConfirmingMint || isMintPending"
          @click="emit('close-modal')"
          label="Cancel"
        />
        <UButton
          type="submit"
          :loading="isConfirmingMint || isMintPending"
          :disabled="isConfirmingMint || isMintPending"
          color="primary"
          class="w-44 text-center"
          data-test="submit-button"
          >Mint {{ tokenSymbol }}
        </UButton>
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { isAddress, parseUnits, type Address } from 'viem'
import { onMounted, reactive, ref } from 'vue'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import SelectMemberContractsInput from '@/components/utils/SelectMemberContractsInput.vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { computed, watch } from 'vue'
import { useTeamStore, useToastStore } from '@/stores'
import { log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'

const memberInputInternal = ref<{ name: string; address: string }>({ name: '', address: '' })
const state = reactive({ address: '', amount: '' })
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

const schema = z.object({
  address: z.string().refine((v) => isAddress(v), { message: 'Invalid address' }),
  amount: z
    .string()
    .min(1, 'Value is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, { message: 'Amount must be greater than 0' })
})

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

const handleMemberInput = (v: { name: string; address: string }) => {
  memberInputInternal.value = v
  state.address = v.address
}

const onSubmit = () => {
  mint({
    abi: INVESTOR_ABI,
    address: investorsAddress.value as Address,
    functionName: 'individualMint',
    args: [state.address as Address, parseUnits(state.amount, 6)]
  })
}

onMounted(() => {
  if (props.memberInput) {
    memberInputInternal.value = props.memberInput
    state.address = props.memberInput.address
  }
})

watch(isConfirmingMint, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isSuccessMinting.value) {
    addSuccessToast('Minted successfully')
    await queryClient.invalidateQueries({
      queryKey: ['readContract']
    })

    mintModal.value = false
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
