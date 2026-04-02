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

      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-3">
          <UFormField name="percentage" label="Ownership after mint" class="flex-1">
            <div class="relative">
              <UInput
                class="w-full pr-8"
                data-test="percentage-input"
                v-model="state.percentage"
                placeholder="0"
                @input="onPercentageInput"
              />
              <span class="absolute top-1/2 right-3 -translate-y-1/2 transform text-sm font-bold text-black">
                %
              </span>
            </div>
          </UFormField>

          <span class="mt-5 text-gray-400 font-medium">=</span>

          <UFormField name="amount" label="Amount" class="flex-1">
            <div class="relative">
              <UInput
                class="w-full pr-16"
                data-test="amount-input"
                v-model="state.amount"
                placeholder="0"
                @input="onAmountInput"
              />
              <span class="absolute top-1/2 right-4 -translate-y-1/2 transform text-sm font-bold text-black">
                {{ tokenSymbol }}
              </span>
            </div>
          </UFormField>
        </div>

        <p v-if="totalSupplyDisplay !== null" class="text-xs text-gray-500">
          Current total supply: <span class="font-semibold">{{ totalSupplyDisplay }} {{ tokenSymbol }}</span>
          <span v-if="totalSupplyDisplay === '0'" class="text-amber-600 ml-2">— percentage mode requires existing supply</span>
        </p>
      </div>

      <div class="flex justify-between gap-4 text-center" data-test="form-actions">
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
          class="text-center"
          data-test="submit-button"
          >Mint {{ tokenSymbol }}
        </UButton>
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { isAddress, parseUnits, formatUnits, type Address } from 'viem'
import { onMounted, reactive, ref, computed } from 'vue'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import SelectMemberContractsInput from '@/components/utils/SelectMemberContractsInput.vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { watch } from 'vue'
import { useTeamStore } from '@/stores'
import { log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'

const TOKEN_DECIMALS = 6

const memberInputInternal = ref<{ name: string; address: string }>({ name: '', address: '' })
const state = reactive({ address: '', amount: '', percentage: '' })
const emit = defineEmits(['close-modal'])

const mintModal = defineModel({ default: false })

const props = defineProps<{
  memberInput?: { name: string; address: string }
  disabled?: boolean
}>()

const queryClient = useQueryClient()
const teamStore = useTeamStore()
const toast = useToast()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))

const schema = z.object({
  address: z.string().refine((v) => isAddress(v), { message: 'Invalid address' }),
  amount: z
    .string()
    .min(1, 'Value is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, { message: 'Amount must be greater than 0' }),
  percentage: z
    .string()
    .refine(
      (v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) < 100),
      { message: 'Percentage must be between 0 and 100' }
    )
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

const { data: totalSupplyRaw } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'totalSupply'
})

const totalSupplyDisplay = computed(() => {
  if (totalSupplyRaw.value === undefined || totalSupplyRaw.value === null) return null
  return formatUnits(totalSupplyRaw.value as bigint, TOKEN_DECIMALS)
})

/**
 * Ownership percentage after mint:  p = X / (S + X)  → X = (p * S) / (1 - p)
 * where S = totalSupply (in display units) and X = amount to mint (in display units)
 */
const computeAmountFromPercentage = (percentageStr: string): string => {
  const pct = Number(percentageStr)
  if (isNaN(pct) || pct <= 0 || pct >= 100) return ''
  const supply = Number(totalSupplyDisplay.value ?? '0')
  if (supply <= 0) return ''
  const p = pct / 100
  const amount = (p * supply) / (1 - p)
  // Round to token decimals precision
  return String(Math.round(amount * 10 ** TOKEN_DECIMALS) / 10 ** TOKEN_DECIMALS)
}

const computePercentageFromAmount = (amountStr: string): string => {
  const amount = Number(amountStr)
  console.log('Computing percentage from amount', { amount, totalSupply: totalSupplyDisplay.value })
  if (isNaN(amount) || amount <= 0) return ''
  const supply = Number(totalSupplyDisplay.value ?? '0')
  if (supply <= 0) return ''
  const pct = (amount / (supply + amount)) * 100
  return String(Math.round(pct * 100) / 100) // 2 decimal places
}

const onPercentageInput = () => {
  state.amount = computeAmountFromPercentage(state.percentage)
}

const onAmountInput = () => {
  state.percentage = computePercentageFromAmount(state.amount)
}

const handleMemberInput = (v: { name: string; address: string }) => {
  memberInputInternal.value = v
  state.address = v.address
}

const onSubmit = () => {
  mint({
    abi: INVESTOR_ABI,
    address: investorsAddress.value as Address,
    functionName: 'individualMint',
    args: [state.address as Address, parseUnits(state.amount, TOKEN_DECIMALS)]
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
    toast.add({ title: 'Minted successfully', color: 'success' })
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
    toast.add({ title: 'Failed to mint', color: 'error' })
  }
})

watch(tokenSymbolError, (value) => {
  if (value) {
    log.error('Error fetching token symbol', value)
    toast.add({ title: 'Error fetching token symbol', color: 'error' })
  }
})
</script>
