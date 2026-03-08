<template>
  <span class="font-bold text-2xl">Invest in Safe &amp; Earn {{ tokenSymbol || 'SHER' }}</span>

  <div class="steps w-full my-4">
    <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Amount</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 2 }">Approval</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 3 }">Deposit</a>
  </div>

  <!-- USDC Amount Input -->
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
      <span class="label-text-alt"
        >tokenSymbol Balance: {{ selectedToken?.amount }} {{ selectedToken?.token.symbol }}
      </span>
    </template>
  </TokenAmount>

  <!-- SHER Compensation Input -->
  <div>
    <CompensationAmount
      v-model:modelValue="sherAmount"
      :deposit-token-symbol="selectedToken?.token.symbol || 'USDC'"
      :rate="formattedMultiplier"
      :disabled="isLoading || !multiplier"
      @update:modelValue="handleSherAmountChange"
    />
  </div>

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
      {{ currentStep === 2 ? 'Approve' : `Deposit & Earn ${tokenSymbol || 'SHER'}` }}
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
import {
  formatSafeDepositRouterMultiplier,
  calculateSherCompensation,
  calculateDepositFromSher
} from '@/utils/safeDepositRouterUtil'
import ButtonUI from '../ButtonUI.vue'
import TokenAmount from './TokenAmount.vue'
import CompensationAmount from './CompensationAmount.vue'
import {
  useSafeDepositRouterAddress,
  useSafeDepositRouterMultiplier
} from '@/composables/safeDepositRouter/reads'
import { useDeposit } from '@/composables/safeDepositRouter/writes'
import { useInvestorSymbol } from '@/composables/investor/reads'

const emits = defineEmits<{
  closeModal: []
}>()

// Component state
const amount = ref<string>('')
const sherAmount = ref<string>('0')
const selectedTokenId = ref<TokenId>('usdc')
const currentStep = ref(1)
const submitting = ref(false)
const isAmountValid = ref(false)
const isUpdatingFromSher = ref(false)

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const { addErrorToast, addSuccessToast } = useToastStore()

// SafeDepositRouter address and multiplier
const safeDepositRouterAddress = useSafeDepositRouterAddress()
const { data: multiplier, error: multiplierError } = useSafeDepositRouterMultiplier()

// Fetch InvestorV1 token symbol
const { data: tokenSymbol, isLoading: isTokenSymbolLoading } = useInvestorSymbol()

// Format multiplier for display using utility function
const formattedMultiplier = computed(() => {
  return formatSafeDepositRouterMultiplier(multiplier.value)
})

// Numeric multiplier for calculations
const multiplierNumber = computed(() => {
  return parseFloat(formattedMultiplier.value) || 0
})

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

// ============================================================================
// BIDIRECTIONAL AMOUNT CALCULATION - Using Utility Functions
// ============================================================================

/**
 * Handle SHER amount input changes - update deposit amount accordingly
 */
const handleSherAmountChange = (value: string) => {
  sherAmount.value = value

  if (value === '' || value === '0') {
    isUpdatingFromSher.value = true
    amount.value = '0'
    return
  }

  const numericValue = parseFloat(value)
  if (isNaN(numericValue) || numericValue < 0) {
    return
  }

  if (multiplierNumber.value > 0) {
    isUpdatingFromSher.value = true
    amount.value = calculateDepositFromSher(value, multiplierNumber.value, TOKEN_DECIMALS)
  }
}

/**
 * Watch deposit amount changes - update SHER amount accordingly
 */
watch(amount, (newAmount) => {
  if (isUpdatingFromSher.value) {
    isUpdatingFromSher.value = false
    return
  }

  sherAmount.value = calculateSherCompensation(newAmount, multiplierNumber.value, TOKEN_DECIMALS)
})

/**
 * Watch multiplier changes - recalculate SHER amount
 */
watch(multiplierNumber, (newMultiplier) => {
  sherAmount.value = calculateSherCompensation(amount.value, newMultiplier, TOKEN_DECIMALS)
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
    isTokenSymbolLoading.value ||
    approveWrite.writeResult.isPending.value ||
    depositWrite.writeResult.isPending.value
)

// ============================================================================
// WATCH PATTERNS - Error Handling
// ============================================================================

watch(multiplierError, (error) => {
  if (error) {
    console.error('Error fetching multiplier:', error)
    addErrorToast('Failed to load SHER compensation rate')
  }
})

watch(
  () => approveWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error approving tokens:', error)
      const errorMessage = parseError(error)

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

watch(
  () => approveWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      addSuccessToast('Token approval successful')
      currentStep.value = 3
      performDeposit()
    }
  }
)

watch(
  () => depositWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error depositing to router:', error)
      const errorMessage = parseError(error)

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

watch(
  () => depositWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      addSuccessToast(
        `Successfully deposited ${amount.value} ${selectedToken.value?.token.symbol} and minted ${sherAmount.value} ${tokenSymbol.value || 'SHER'} tokens`
      )
      reset()
      emits('closeModal')
    }
  }
)

watch(amount, () => {
  currentStep.value = 1
})

// ============================================================================
// METHODS
// ============================================================================

function reset() {
  amount.value = ''
  sherAmount.value = '0'
  selectedTokenId.value = 'usdc'
  currentStep.value = 1
  submitting.value = false
  isAmountValid.value = false
  isUpdatingFromSher.value = false
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
  if (!multiplier.value) {
    addErrorToast('Unable to calculate SHER compensation')
    return
  }

  submitting.value = true
  const currentAllowance = (allowance.value as bigint | undefined) ?? 0n
  if (currentAllowance < bigIntAmount.value) {
    currentStep.value = 2

    try {
      await approveWrite.executeWrite([safeDepositRouterAddress.value, bigIntAmount.value])
    } catch (error) {
      console.error('Approve execution error:', error)
    }
  } else {
    currentStep.value = 3
    await performDeposit()
  }
}
</script>
