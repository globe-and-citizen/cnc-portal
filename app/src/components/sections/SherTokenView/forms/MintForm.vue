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

      <UFormField name="amount" label="Mint amount">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <UInput
              class="flex-1"
              data-test="percentage-input"
              v-model="state.percentage"
              placeholder="0"
              @update:modelValue="onPercentageChange"
            >
              <template #trailing>
                <span class="text-sm font-semibold text-gray-500 select-none">%</span>
              </template>
            </UInput>

            <UIcon name="i-lucide-equal" class="text-gray-400 shrink-0 size-4" />

            <UInput
              class="flex-1"
              data-test="amount-input"
              v-model="state.amount"
              placeholder="0"
              @update:modelValue="onAmountChange"
            >
              <template #trailing>
                <span class="text-sm font-semibold text-gray-500 select-none">{{ tokenSymbol }}</span>
              </template>
            </UInput>
          </div>

          <p v-if="totalSupplyDisplay !== null" class="text-xs text-gray-500">
            Total supply: <span class="font-semibold">{{ totalSupplyDisplay }} {{ tokenSymbol }}</span>
            <span v-if="totalSupplyDisplay === '0'" class="text-amber-600 ml-2">— percentage mode requires existing supply</span>
          </p>
        </div>
      </UFormField>

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
    .min(1, 'Enter an amount or a percentage')
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

const onPercentageChange = (v: string | number) => {
  state.amount = computeAmountFromPercentage(String(v))
}

const onAmountChange = (v: string | number) => {
  state.percentage = computePercentageFromAmount(String(v))
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
