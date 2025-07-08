<template>
  <span class="font-bold text-2xl">Deposit to Team Bank Contract</span>

  <div v-if="selectedToken?.token.id !== 'native'" class="steps w-full my-4">
    <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Amount</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 2 }">Approval</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 3 }">Deposit</a>
  </div>

  <!-- New Token Amount Component -->
  <TokenAmount
    :tokens="tokenList"
    v-model:modelValue="amount"
    v-model:modelToken="selectedTokenId"
    :isLoading="isLoading"
    @validation="isAmountValid = $event"
  />

  <div class="modal-action justify-center">
    <ButtonUI
      variant="primary"
      @click="submitForm"
      :loading="submitting"
      :disabled="isLoading || !isAmountValid"
      data-test="deposit-button"
    >
      Deposit
    </ButtonUI>
    <ButtonUI variant="error" outline @click="$emit('closeModal')" data-test="cancel-button"
      >Cancel</ButtonUI
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId
} from '@wagmi/vue'

import { useQueryClient } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { parseEther, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import TokenAmount from './TokenAmount.vue'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import BankABI from '@/artifacts/abi/bank.json'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import ButtonUI from '../ButtonUI.vue'

const emits = defineEmits(['closeModal'])
// Add validation event
const props = defineProps<{
  loading?: boolean
  loadingText?: string
  bankAddress: Address
}>()

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('native') // Default to native token (ETH)
const currentStep = ref(1)
const submitting = ref(false)
const isAmountValid = ref(false)

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const { addErrorToast, addSuccessToast } = useToastStore()

const queryClient = useQueryClient()
const chainId = useChainId()

// Reactive state for balances: composable that fetches address balances
const { balances, isLoading } = useContractBalance(userDataStore.address as Address)

// Native token desposit
const { sendTransactionAsync: sendTransaction, data: depositHash } = useSendTransaction()

// Wait for transaction receipt for Native token deposit
const { status: nativeTokenDespositStatus } = useWaitForTransactionReceipt({
  hash: depositHash
})

// Write contract for ERC20 token deposit
const { writeContractAsync: writeTokenDeposit, data: tokenDepositHash } = useWriteContract()

// Wait for transaction receipt for ERC20 token deposit
const { status: erc20TokenDespositStatus } = useWaitForTransactionReceipt({
  hash: tokenDepositHash
})

// Write contract for ERC20 token spend cap approval
const {
  writeContractAsync: approve,
  // isPending: isPendingApprove,
  data: approveHash
} = useWriteContract()

// Wait for transaction receipt for ERC20 token spend cap approval
const { status: erc20ApprovalStatus } = useWaitForTransactionReceipt({
  hash: approveHash
})

// Computed properties
// Token list derived from SUPPORTED_TOKENS
const tokenList = computed(() =>
  SUPPORTED_TOKENS.map((token) => ({
    symbol: token.symbol,
    tokenId: token.id,
    name: token.name,
    code: token.code, // Add the missing 'code' property
    balance: balances.value.find((b) => b.token.id === token.id)?.amount ?? 0,
    price: currencyStore.getTokenPrice(token.id)
  }))
)

// computed property for selected token
const selectedToken = computed(() =>
  balances.value.find((b) => b.token.id === selectedTokenId.value)
)

// Methods

/**
 * Utility function to wait for a condition to be met
 * @description This function repeatedly checks a condition until it returns true or a timeout occurs.
 * @param condition () => boolean - A function that returns a boolean indicating whether the condition is met.
 * @param timeout
 */
const waitForCondition = (condition: () => boolean, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      console.log('Checking condition...')
      if (condition()) {
        clearInterval(interval)
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval)
        reject(new Error('Condition not met within timeout'))
      }
    }, 1000)
  })
}

// Remove unused notZero and notExceedingBalance

const submitForm = async () => {
  if (!isAmountValid.value) return
  submitting.value = true
  try {
    if (selectedTokenId.value === 'native') {
      await sendTransaction({
        to: props.bankAddress,
        value: parseEther(amount.value)
      })

      // Invalidate the balance queries to update the balances
      queryClient.invalidateQueries({
        queryKey: [
          'balance',
          {
            address: props.bankAddress,
            chainId: chainId
          }
        ]
      })
      await waitForCondition(() => nativeTokenDespositStatus.value === 'success', 15000)

      addSuccessToast(`${selectedToken.value?.token.code} deposited successfully`)
      emits('closeModal')
    } else {
      const tokenAmount = BigInt(Number(amount.value) * 1e6)
      if (selectedToken.value) {
        const allowance = await readContract(config, {
          address: selectedToken.value.token.address as Address,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [userDataStore.address as Address, props.bankAddress]
        })
        const currentAllowance = allowance ? allowance.toString() : 0n
        if (Number(currentAllowance) < Number(tokenAmount)) {
          currentStep.value = 2
          await approve({
            address: selectedToken.value.token.address as Address,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [props.bankAddress, tokenAmount]
          })

          // wait for 3s, timeout for approval transaction
          // await new Promise((resolve) => setTimeout(resolve, 3000))

          await waitForCondition(() => erc20ApprovalStatus.value === 'success', 15000)

          // wait for transaction receipt
          addSuccessToast('Token approved successfully')
        }
        currentStep.value = 3
        await writeTokenDeposit({
          address: props.bankAddress,
          abi: BankABI,
          functionName: 'depositToken',
          args: [selectedToken.value.token.address as Address, tokenAmount]
        })
        await waitForCondition(() => erc20TokenDespositStatus.value === 'success', 15000)

        // Invalidate the balance queries to update the balances
        queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              address: selectedToken.value.token.address as Address,
              args: [props.bankAddress],
              chainId: chainId
            }
          ]
        })
        depositAmount.value = ''
        addSuccessToast('USDC deposited successfully')
        emits('closeModal')
      } else {
        addErrorToast('Selected token is not valid')
      }
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to deposit ${selectedTokenId.value}`)
  }
  submitting.value = false
  currentStep.value = 1
}
</script>
