<template>
  <UStepper
    v-if="selectedToken?.token.id !== 'native'"
    v-model="currentStep"
    :items="stepperItems"
    disabled
    class="my-4 w-full"
  />

  <UForm :schema="formSchema" :state="{ amount }" @submit="submitForm">
    <UFormField name="amount" class="w-full">
      <TokenAmount
        :tokens="tokenList"
        v-model="tokenAmountModel"
        :isLoading="isLoading"
        @validation="isAmountValid = $event"
      >
        <template #label>
          <div class="flex w-full items-center justify-between text-sm font-medium">
            <span>Deposit</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              Balance: {{ selectedToken?.amount }} {{ selectedToken?.token.symbol }}
            </span>
          </div>
        </template>
      </TokenAmount>
    </UFormField>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :description="errorMessage"
      icon="i-lucide-circle-alert"
      class="mt-3"
    />

    <div class="mt-4 flex justify-between">
      <UButton
        color="neutral"
        variant="outline"
        type="button"
        data-test="cancel-button"
        @click="handleCancel"
      >
        Cancel
      </UButton>
      <UButton
        color="primary"
        type="submit"
        :loading="submitting"
        :disabled="isLoading || submitting || isNativeDepositLoading"
        data-test="deposit-button"
      >
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { z } from 'zod'
import { parseEther, zeroAddress, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useSafeSendTransaction } from '@/composables/transactions/useSafeSendTransaction'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { SUPPORTED_TOKENS, type TokenId, USDC_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import { useCurrencyStore, useUserDataStore } from '@/stores'
import TokenAmount from './TokenAmount.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { ERC20_ABI } from '@/artifacts/abi/erc20'
import { waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/wagmi.config'

const queryClient = useQueryClient()
const chainId = useChainId()

const emits = defineEmits(['closeModal'])
const props = defineProps<{
  safeAddress: Address
}>()

function reset() {
  amount.value = ''
  selectedTokenId.value = 'native'
  currentStep.value = 0
  submitting.value = false
  isAmountValid.value = false
}

defineExpose({ reset })

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('native')
const tokenAmountModel = computed({
  get: () => ({ amount: amount.value, tokenId: selectedTokenId.value }),
  set: (value: { amount: string; tokenId: TokenId }) => {
    amount.value = value.amount ?? ''
    selectedTokenId.value = value.tokenId ?? 'native'
  }
})
const currentStep = ref(0)
const stepperItems = [
  { title: 'Amount', value: 0 },
  { title: 'Approval', value: 1 },
  { title: 'Deposit', value: 2 }
]
const submitting = ref(false)
const isAmountValid = ref(false)

const formSchema = computed(() =>
  z.object({
    amount: z
      .string()
      .trim()
      .min(1, 'Amount is required.')
      .refine((value) => {
        if (!/^(?:\d+\.?\d*|\.\d+)$/.test(value)) return false
        const numericAmount = Number(value)
        return Number.isFinite(numericAmount) && numericAmount > 0
      }, 'Enter a valid amount greater than 0.')
      .refine((value) => {
        if (!selectedToken.value) return true
        return Number(value) <= (selectedToken.value.amount ?? 0)
      }, 'Amount exceeds available balance.')
  })
)

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const toast = useToast()

const errorMessage = computed(() => {
  const err =
    nativeError.value ||
    ERC20ApproveResult.writeResult.error.value ||
    ERC20ApproveResult.receiptResult.error.value ||
    transferError.value ||
    transferReceiptError.value
  return err ? ((err as { shortMessage?: string }).shortMessage ?? err.message) : null
})

// Reactive state for balances
const { balances, isLoading } = useContractBalance(userDataStore.address as Address)

// Native token deposit using safe transaction handler
const {
  sendTransaction,
  isLoading: isNativeDepositLoading,
  isConfirmed: isNativeDepositConfirmed,
  receipt: nativeReceipt,
  error: nativeError
} = useSafeSendTransaction()

// Computed properties
const tokenList = computed(() =>
  SUPPORTED_TOKENS.map((token) => ({
    symbol: token.symbol,
    tokenId: token.id,
    name: token.name,
    code: token.code,
    balance: balances.value.find((b) => b.token.id === token.id)?.amount ?? 0,
    price: currencyStore.getTokenPrice(token.id)
  }))
)

// computed property for selected token
const selectedToken = computed(() =>
  balances.value.find((b) => b.token.id === selectedTokenId.value)
)
const submitLabel = computed(() =>
  selectedToken.value?.token.id !== 'native' && currentStep.value === 1 ? 'Approval' : 'Deposit'
)
const selectedTokenAddress = computed<Address>(
  () => selectedToken.value?.token.address ?? zeroAddress
)

const { data: allowance } = useErc20Allowance(
  selectedTokenAddress,
  userDataStore.address as Address,
  props.safeAddress
)

const allowanceValue = computed<bigint>(() =>
  typeof allowance.value === 'bigint' ? allowance.value : 0n
)

// Computed values for approval composable
const bigIntAmount = computed(() => {
  // Handle NaN case
  return isNaN(Number(amount.value)) ? 0n : BigInt(Number(amount.value) * 1e6)
})

const ERC20ApproveResult = useERC20Approve(
  selectedTokenAddress,
  computed(() => props.safeAddress),
  bigIntAmount
)

// ERC20 transfer for Safe
const { data: transferHash, mutateAsync: writeTransfer, error: transferError } = useWriteContract()

const { error: transferReceiptError } = useWaitForTransactionReceipt({
  hash: transferHash
})

// Success handling
watch(isNativeDepositConfirmed, (confirmed) => {
  if (confirmed && nativeReceipt.value) {
    amount.value = ''
    toast.add({
      title: `${selectedToken.value?.token.code} deposited successfully`,
      color: 'success'
    })
    emits('closeModal')
  }
})

const handleCancel = () => {
  reset()
  emits('closeModal')
}

const submitForm = async () => {
  if (!isAmountValid.value) return
  if (isNativeDepositLoading.value) return
  submitting.value = true
  try {
    // Deposit of native token (ETH/POL...)
    if (selectedTokenId.value === 'native') {
      await sendTransaction(props.safeAddress, parseEther(amount.value))
    } else {
      // USDC deposit workflow - step 1 to 2 to 3 in one execution
      if (!(allowanceValue.value >= bigIntAmount.value)) {
        currentStep.value = 1

        // Run spending cap approval and wait for confirmation
        await ERC20ApproveResult.executeWrite([props.safeAddress, bigIntAmount.value])
        if (
          ERC20ApproveResult.receiptResult.error.value ||
          ERC20ApproveResult.writeResult.error.value
        ) {
          throw new Error('Approval failed')
        }
      }

      // Step 3: Proceed to transfer (continue from step 2 if approval was done)
      currentStep.value = 2

      // Transfer USDC to Safe (not deposit to a bank contract)
      if (selectedTokenId.value === 'usdc.e') {
        await writeTransfer({
          address: USDC_E_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [props.safeAddress, bigIntAmount.value]
        })
      }

      if (selectedTokenId.value === 'usdc') {
        await writeTransfer({
          address: USDC_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [props.safeAddress, bigIntAmount.value]
        })
      }

      if (!transferHash.value) {
        throw new Error('Transfer transaction not initiated')
      }

      // Wait for transaction confirmation
      await waitForTransactionReceipt(config, { hash: transferHash.value })

      // Invalidate ERC20 balance query for Safe
      const invalidateErc20Balance = (tokenAddress: Address, target: Address) =>
        queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              address: tokenAddress,
              chainId,
              functionName: 'balanceOf',
              args: [target]
            }
          ]
        })
      const invalidationAddress = selectedTokenId.value === 'usdc' ? USDC_ADDRESS : USDC_E_ADDRESS
      invalidateErc20Balance(invalidationAddress as Address, props.safeAddress)

      // Also invalidate native balance
      await queryClient.invalidateQueries({
        queryKey: ['balance', { address: props.safeAddress, chainId }]
      })

      submitting.value = false
      amount.value = ''
      toast.add({
        title: `${selectedToken.value?.token.code} deposited successfully`,
        color: 'success'
      })
      emits('closeModal')
    }
  } catch (error) {
    console.error('Deposit failed:', error)
    submitting.value = false
  }
}
</script>
