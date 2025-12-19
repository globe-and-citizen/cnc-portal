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
  >
    <template #label>
      <span class="label-text">Deposit</span>
      <span class="label-text-alt"
        >Balance: {{ selectedToken?.amount }} {{ selectedToken?.token.symbol }}</span
      >
    </template>
  </TokenAmount>
  <div class="modal-action justify-between">
    <ButtonUI
      variant="error"
      outline
      @click="
        () => {
          reset()
          $emit('closeModal')
        }
      "
      data-test="cancel-button"
      >Cancel</ButtonUI
    >
    <ButtonUI
      variant="primary"
      @click="submitForm"
      :loading="submitting"
      :disabled="isLoading || !isAmountValid"
      data-test="deposit-button"
    >
      {{
        selectedToken?.token.id !== 'native' && currentStep === 2
          ? 'Approval'
          : currentStep === 3
            ? 'Deposit'
            : 'Deposit'
      }}
    </ButtonUI>
  </div>
  <!-- You can use timeline for debuging -->
  <!-- <TransactionTimeline
    v-if="ERC20ApproveResult.timelineSteps.value && currentStep === 2"
    :show="true"
    :steps="ERC20ApproveResult.timelineSteps.value"
    title="Bank Spending Cap Approval"
  />
  <TransactionTimeline
    v-if="bankDepositTokenResult.timelineSteps.value && currentStep === 3"
    :show="true"
    :steps="bankDepositTokenResult.timelineSteps.value"
    title="Bank Deposit" 
  />-->
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseEther, zeroAddress, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useSafeSendTransaction } from '@/composables/transactions/useSafeSendTransaction'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { useDepositToken } from '@/composables/bank/bankWrites'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import ButtonUI from '../ButtonUI.vue'
import TokenAmount from './TokenAmount.vue'
// import { formatDataForDisplay, parseError } from '@/utils'
// import TransactionTimeline from '../ui/TransactionTimeline.vue'

const emits = defineEmits(['closeModal'])
// Add validation event
const props = defineProps<{
  loading?: boolean
  loadingText?: string
  bankAddress: Address
}>()

function reset() {
  amount.value = ''
  selectedTokenId.value = 'native'
  currentStep.value = 1
  submitting.value = false
  isAmountValid.value = false
}

defineExpose({ reset })

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('native') // Default to native token (ETH)
const currentStep = ref(1)
const submitting = ref(false)
const isAmountValid = ref(false) // Validation state used by TokenAmount component

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
const selectedTokenAddress = computed<Address>(
  () => selectedToken.value?.token.address ?? zeroAddress
)

const { data: allowance } = useErc20Allowance(
  selectedTokenAddress,
  userDataStore.address as Address,
  props.bankAddress
)

// Computed values for approval composable
const bigIntAmount = computed(() => BigInt(Number(amount.value) * 1e6))

const ERC20ApproveResult = useERC20Approve(
  selectedTokenAddress,
  computed(() => props.bankAddress),
  bigIntAmount
)

const bankDepositTokenResult = useDepositToken(selectedTokenAddress, bigIntAmount)

// Methods

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
  if (!isAmountValid.value) return // Validation check
  // TODO: handle multiple submission for native and erc20
  if (isNativeDepositLoading.value) return // Prevent multiple submissions
  submitting.value = true
  try {
    // Deposit of native token (ETH/POL...)
    if (selectedTokenId.value === 'native') {
      await sendTransaction(props.bankAddress, parseEther(amount.value))
    } else {
      if (!((allowance.value ?? 0n) >= bigIntAmount.value)) {
        currentStep.value = 2

        // Run spending cap
        await ERC20ApproveResult.executeWrite([props.bankAddress, bigIntAmount.value])
        if (
          ERC20ApproveResult.receiptResult.error.value ||
          ERC20ApproveResult.writeResult.error.value
        ) {
          throw new Error('Approval failed')
        }
      }
      currentStep.value = 3
      await bankDepositTokenResult.executeWrite([selectedTokenAddress.value, bigIntAmount.value])

      // Check if bankDepositTokenResult has an error
      if (
        bankDepositTokenResult.receiptResult.error.value ||
        bankDepositTokenResult.writeResult.error.value
      ) {
        throw new Error('Deposit failed')
      }

      submitting.value = false
      amount.value = ''
      addSuccessToast(`${selectedToken.value?.token.code} deposited successfully`)
      emits('closeModal')
    }
  } catch {
    // console.error(error)
    addErrorToast(`Failed to deposit ${selectedTokenId.value}`)
    submitting.value = false
    // currentStep.value = 1
  }
}
</script>
