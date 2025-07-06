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
  />

  <div class="modal-action justify-center">
    <ButtonUI
      variant="primary"
      @click="submitForm"
      :loading="submitting"
      :disabled="isLoading || $v.amount.$invalid"
    >
      Deposit
    </ButtonUI>
    <ButtonUI variant="error" outline @click="$emit('closeModal')">Cancel</ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import BankABI from '@/artifacts/abi/bank.json'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import ButtonUI from '../ButtonUI.vue'
import { useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { parseEther, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import TokenAmount from './TokenAmount.vue'

const emits = defineEmits(['closeModal'])
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

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const { addErrorToast, addSuccessToast } = useToastStore()

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
const { status: erc20ApprovaleSatus } = useWaitForTransactionReceipt({
  hash: approveHash
})

// Computed properties
// Token list derived from SUPPORTED_TOKENS
const tokenList = computed(() =>
  SUPPORTED_TOKENS.map((token) => ({
    symbol: token.symbol,
    tokenId: token.id,
    name: token.name,
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

// Validation rules
const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const notExceedingBalance = helpers.withMessage('Amount exceeds your balance', (value: string) => {
  if (!value || parseFloat(value) <= 0) return true
  const amountValue = selectedToken.value?.amount ?? 0
  return parseFloat(value) <= amountValue
})

const rules = {
  amount: {
    required,
    numeric,
    notZero,
    notExceedingBalance
    // validDecimals
  }
}

const $v = useVuelidate(rules, { amount })

const submitForm = async () => {
  await $v.value.$touch()
  if ($v.value.$invalid) return
  submitting.value = true
  try {
    if (selectedTokenId.value === 'native') {
      await sendTransaction({
        to: props.bankAddress,
        value: parseEther(amount.value)
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
          await new Promise((resolve) => setTimeout(resolve, 3000))
          await waitForCondition(() => erc20ApprovaleSatus.value === 'success', 15000)
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
