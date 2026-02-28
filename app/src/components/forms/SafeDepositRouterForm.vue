<template>
  <span class="font-bold text-2xl">Invest in Safe &amp; Earn SHER</span>

  <div class="steps w-full my-4">
    <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Amount</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 2 }">Approval</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 3 }">Deposit</a>
  </div>

  <TokenAmount
    :tokens="tokenList"
    v-model:modelValue="amount"
    v-model:modelToken="selectedTokenId"
    :isLoading="isLoading"
    @validation="isAmountValid = $event"
    data-test="token-amount"
  >
    <template #label>
      <span class="label-text">Deposit</span>
      <span class="label-text-alt">
        Balance: {{ selectedToken?.amount }} {{ selectedToken?.token.symbol }}
      </span>
    </template>
  </TokenAmount>

  <div class="modal-action justify-between">
    <ButtonUI variant="error" outline data-test="cancel-button" @click="handleCancel">
      Cancel
    </ButtonUI>
    <ButtonUI
      variant="primary"
      :loading="submitting"
      :disabled="isLoading || !isAmountValid || !safeDepositRouterAddress"
      data-test="deposit-button"
      @click="submitForm"
    >
      {{ currentStep === 2 ? 'Approve' : 'Deposit & Earn SHER' }}
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseUnits, zeroAddress, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import { parseError } from '@/utils'
import ButtonUI from '../ButtonUI.vue'
import TokenAmount from './TokenAmount.vue'
import { useSafeDepositRouterAddress } from '@/composables/safeDepositRouter/reads'
import { useDeposit } from '@/composables/safeDepositRouter/writes'

const emits = defineEmits<{
  closeModal: []
}>()

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('usdc')
const currentStep = ref(1)
const submitting = ref(false)
const isAmountValid = ref(false)

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const { addErrorToast, addSuccessToast } = useToastStore()

// SafeDepositRouter address
const safeDepositRouterAddress = useSafeDepositRouterAddress()

// Reactive state for balances
const { balances, isLoading: isBalanceLoading } = useContractBalance(
  userDataStore.address as Address
)

// Only show USDC for deposit router
const ROUTER_SUPPORTED_TOKENS: TokenId[] = ['usdc']

const tokenList = computed(() =>
  SUPPORTED_TOKENS.filter((token) => ROUTER_SUPPORTED_TOKENS.includes(token.id as TokenId)).map(
    (token) => ({
      symbol: token.symbol,
      tokenId: token.id,
      name: token.name,
      code: token.code,
      balance: balances.value.find((b) => b.token.id === token.id)?.amount ?? 0,
      price: currencyStore.getTokenPrice(token.id)
    })
  )
)

const selectedToken = computed(() =>
  balances.value.find((b) => b.token.id === selectedTokenId.value)
)

const selectedTokenAddress = computed<Address>(
  () => selectedToken.value?.token.address ?? zeroAddress
)

// Amount in token decimals (USDC = 6 decimals)
const TOKEN_DECIMALS = 6
const bigIntAmount = computed<bigint>(() => {
  if (!amount.value || isNaN(Number(amount.value))) return 0n
  try {
    return parseUnits(amount.value, TOKEN_DECIMALS)
  } catch {
    return 0n
  }
})

// Allowance check
const { data: allowance } = useErc20Allowance(
  selectedTokenAddress,
  userDataStore.address as Address,
  safeDepositRouterAddress as unknown as Address
)

// ERC20 Approve composable
const approveWrite = useERC20Approve(
  selectedTokenAddress,
  safeDepositRouterAddress as unknown as Address,
  bigIntAmount
)

// Deposit composable
const depositWrite = useDeposit()

// Combined loading state
const isLoading = computed(
  () =>
    isBalanceLoading.value ||
    approveWrite.writeResult.isPending.value ||
    depositWrite.writeResult.isPending.value
)

// ============================================================================
// WATCH PATTERNS - Following established patterns
// ============================================================================
// Watch for approve errors
watch(
  () => approveWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error approving tokens:', error)
      const errorMessage = parseError(error)

      // Check for user rejection
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast('Failed to approve tokens')
      }

      submitting.value = false
      currentStep.value = 1
    }
  }
)

// Watch for approve success
watch(
  () => approveWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      addSuccessToast('Token approval successful')
      // Continue to deposit step
      currentStep.value = 3
      performDeposit()
    }
  }
)

// Watch for deposit errors
watch(
  () => depositWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error depositing to router:', error)
      const errorMessage = parseError(error)

      // Check for user rejection
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast('Failed to deposit')
      }

      submitting.value = false
      currentStep.value = 1
    }
  }
)

// Watch for deposit success
watch(
  () => depositWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      addSuccessToast('USDC deposited and SHER tokens minted successfully')
      reset()
      emits('closeModal')
    }
  }
)

// Reset step when amount changes
watch(amount, () => {
  currentStep.value = 1
})

function reset() {
  amount.value = ''
  selectedTokenId.value = 'usdc'
  currentStep.value = 1
  submitting.value = false
  isAmountValid.value = false
}

defineExpose({ reset })

function handleCancel() {
  reset()
  emits('closeModal')
}

async function performDeposit() {
  try {
    await depositWrite.executeWrite(selectedTokenAddress.value, bigIntAmount.value)
  } catch (error) {
    // Error handling is done in the watch
    console.error('Deposit execution error:', error)
  }
}

const submitForm = async () => {
  if (!isAmountValid.value) return
  if (!safeDepositRouterAddress.value) {
    addErrorToast('SafeDepositRouter address not found')
    return
  }
  if (!selectedToken.value) {
    addErrorToast('No token selected')
    return
  }

  submitting.value = true

  // Step 1: Check if approval is needed
  const currentAllowance = (allowance.value as bigint | undefined) ?? 0n
  if (currentAllowance < bigIntAmount.value) {
    currentStep.value = 2

    try {
      await approveWrite.executeWrite([safeDepositRouterAddress.value, bigIntAmount.value])
      // Success/error handling is done in the watch
    } catch (error) {
      // Error handling is done in the watch
      console.error('Approve execution error:', error)
    }
  } else {
    // Skip approval, go directly to deposit
    currentStep.value = 3
    await performDeposit()
  }
}
</script>
