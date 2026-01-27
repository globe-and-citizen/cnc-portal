<template>
  <span class="font-bold text-2xl">Deposit to Team Safe Contract</span>

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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseEther, zeroAddress, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useSafeSendTransaction } from '@/composables/transactions/useSafeSendTransaction'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { SUPPORTED_TOKENS, type TokenId, USDC_ADDRESS } from '@/constant'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import ButtonUI from '../ButtonUI.vue'
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
  currentStep.value = 1
  submitting.value = false
  isAmountValid.value = false
}

defineExpose({ reset })

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('native')
const currentStep = ref(1)
const submitting = ref(false)
const isAmountValid = ref(false)

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const { addErrorToast, addSuccessToast } = useToastStore()

// Reactive state for balances
const { balances, isLoading } = useContractBalance(userDataStore.address as Address)

// Native token deposit using safe transaction handler
const {
  sendTransaction,
  isLoading: isNativeDepositLoading,
  isConfirmed: isNativeDepositConfirmed,
  receipt: nativeReceipt
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
const selectedTokenAddress = computed<Address>(
  () => selectedToken.value?.token.address ?? zeroAddress
)

const { data: allowance } = useErc20Allowance(
  selectedTokenAddress,
  userDataStore.address as Address,
  props.safeAddress
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
const { data: transferHash, writeContractAsync: writeTransfer } = useWriteContract()

useWaitForTransactionReceipt({
  hash: transferHash
})

// Success handling
watch(isNativeDepositConfirmed, (confirmed) => {
  if (confirmed && nativeReceipt.value) {
    amount.value = ''
    addSuccessToast(`${selectedToken.value?.token.code} deposited successfully`)
    emits('closeModal')
  }
})

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
      if (!((allowance.value ?? 0n) >= bigIntAmount.value)) {
        currentStep.value = 2

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
      currentStep.value = 3

      // Transfer USDC to Safe (not deposit to a bank contract)
      await writeTransfer({
        address: USDC_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [props.safeAddress, bigIntAmount.value]
      })

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

      invalidateErc20Balance(USDC_ADDRESS as Address, props.safeAddress)

      // Also invalidate native balance
      await queryClient.invalidateQueries({
        queryKey: ['balance', { address: props.safeAddress, chainId }]
      })

      submitting.value = false
      amount.value = ''
      addSuccessToast(`${selectedToken.value?.token.code} deposited successfully`)
      emits('closeModal')
    }
  } catch (error) {
    console.error('Deposit failed:', error)
    addErrorToast(`Failed to deposit ${selectedTokenId.value}`)
    submitting.value = false
  }
}
</script>
