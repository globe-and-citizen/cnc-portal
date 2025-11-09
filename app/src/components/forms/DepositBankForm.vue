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

  <!-- simulateGasResult{{ simulateGasResult.data }} -->
  <!-- Transaction Timeline for Non-Native Tokens -->
  <!-- <div v-if="selectedToken?.token.id !== 'native'" class="my-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      Approval Timeline
      <TransactionTimeline
        :show="currentStep >= 2 && !isAllowanceSufficient"
        :steps="ERC20ApproveResult.timelineSteps.value"
        title="Token Approval"
      />

      Deposit Timeline
      <TransactionTimeline
        :show="currentStep >= 3"
        :steps="bankDepositTokenResult.timelineSteps.value"
        title="Token Deposit"
      />
    </div>
  </div> -->

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
      Deposit
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseEther, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useSafeSendTransaction } from '@/composables/transactions/useSafeSendTransaction'
import { useERC20Reads } from '@/composables/erc20/index'
import { useDepositToken } from '@/composables/bank/bankWrites'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import ButtonUI from '../ButtonUI.vue'
import TokenAmount from './TokenAmount.vue'
import { useERC20Approve } from '@/composables/erc20/erc20Writes'

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
const selectedTokenAddress = computed<Address>(
  () => selectedToken.value?.token.address ?? '0x0000000000000000000000000000000000000000'
)
const { useErc20Allowance } = useERC20Reads(selectedTokenAddress)

const { data: allowance } = useErc20Allowance(userDataStore.address as Address, props.bankAddress)

// Computed values for approval composable
const bigIntAmount = computed(() => BigInt(Number(amount.value) * 1e6))

const isAllowanceSufficient = computed(() => {
  if (selectedTokenId.value === 'native') return true
  const currentAllowance = allowance.value ? allowance.value.toString() : 0n
  const requiredAmount = bigIntAmount.value
  return Number(currentAllowance) >= Number(requiredAmount)
})

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
        if (!isAllowanceSufficient.value) {
          currentStep.value = 2
          await ERC20ApproveResult.executeWrite([props.bankAddress, tokenAmount])
        } else {
          currentStep.value = 3
        }
      } else {
        addErrorToast('Selected token is not valid')
      }
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to deposit ${selectedTokenId.value}`)
  }
}

// watch for allowance changes to move to step 3
watch(ERC20ApproveResult.receiptResult.data, () => {
  if (submitting.value === false) return
  currentStep.value = 3
})

// check if the current step is 3 then executeDepositToken
watch(currentStep, async (newStep) => {
  if (newStep === 3) {
    await bankDepositTokenResult.executeWrite([selectedTokenAddress.value, bigIntAmount.value])
  }
})

watch(bankDepositTokenResult.receiptResult.data, () => {
  if (submitting.value === false) return
  submitting.value = false
  amount.value = ''
  addSuccessToast(`${selectedToken.value?.token.code} deposited successfully`)
  emits('closeModal')
})
</script>
