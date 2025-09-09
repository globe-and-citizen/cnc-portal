<template>
  <span class="font-bold text-2xl">Deposit to Team Bank Contract</span>
  allowance{{ allowance }}

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
import { ref, computed, watch } from 'vue'
import { parseEther, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useSafeSendTransaction } from '@/composables/transactions/useSafeSendTransaction'
import { useERC20Reads, useERC20WriteFunctions } from '@/composables/erc20/index'
import TokenAmount from './TokenAmount.vue'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import ButtonUI from '../ButtonUI.vue'
import { useBankWritesFunctions } from '@/composables/bank'

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

// Reactive state for balances: composable that fetches address balances
const { balances, isLoading } = useContractBalance(userDataStore.address as Address)

// Native token deposit using safe transaction handler
const {
  sendTransaction,
  isLoading: isNativeDepositLoading,
  isConfirmed: isNativeDepositConfirmed,
  receipt: nativeReceipt
  // error: nativeDepositError
} = useSafeSendTransaction()

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
const selectedTokenAddress = computed(
  () => selectedToken.value?.token.address ?? '0x0000000000000000000000000000000000000000'
)
const { useErc20Allowance } = useERC20Reads(selectedTokenAddress)

const { data: allowance } = useErc20Allowance(userDataStore.address as Address, props.bankAddress)

const {
  // isConfirmed: approvedIsConfirmed,
  writeApprove,
  receipt: tokenApprovalReceipt
} = useERC20WriteFunctions(selectedTokenAddress)

const {
  // isBankAddressValid,
  // isLoading: depositTokenIsLoading,
  // isWritePending,
  // isConfirming,
  // isConfirmed,
  // writeContractData,
  receipt: depositReceipt,
  // error: writeError,
  depositToken
} = useBankWritesFunctions()

// const { execute: approve } = writeApprove()

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

// Success handling
watch(isNativeDepositConfirmed, (confirmed) => {
  if (confirmed && nativeReceipt.value) {
    amount.value = ''
    addSuccessToast(`${selectedToken.value?.token.code} deposited successfully`)
    emits('closeModal')
  }
})
// Remove unused notZero and notExceedingBalance

const submitForm = async () => {
  if (!isAmountValid.value) return
  if (isNativeDepositLoading.value) return
  submitting.value = true
  try {
    // Deposit of native token (ETH/POL...)
    if (selectedTokenId.value === 'native') {
      await sendTransaction(props.bankAddress, parseEther(amount.value))
    } else {
      const tokenAmount = BigInt(Number(amount.value) * 1e6)
      if (selectedToken.value) {
        const currentAllowance = allowance.value ? allowance.value.toString() : 0n
        if (Number(currentAllowance) < Number(tokenAmount)) {
          currentStep.value = 2
          console.log('Will write the approval')
          await writeApprove(props.bankAddress, tokenAmount)
          console.log('Approval donne: waiting for the approval receipt')
          await waitForCondition(() => tokenApprovalReceipt.value?.status === 'success', 15000)

          // wait for transaction receipt
          addSuccessToast('Token approved successfully')
        }
        currentStep.value = 3
        await depositToken(selectedToken.value.token.address as Address, amount.value)
        // await writeTokenDeposit({
        //   address: props.bankAddress,
        //   abi: BankABI,
        //   functionName: 'depositToken',
        //   args: [selectedToken.value.token.address as Address, tokenAmount]
        // })
        await waitForCondition(() => depositReceipt.value?.status === 'success', 15000)

        amount.value = ''
        addSuccessToast('USDC deposited successfully')
        emits('closeModal')
      } else {
        addErrorToast('Selected token is not valid')
      }
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to deposit ${selectedTokenId.value}`)
  } finally {
    submitting.value = false
    currentStep.value = 1
  }
}
</script>
