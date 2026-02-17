<template>
  <span class="font-bold text-2xl">{{ title }}</span>

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
import {
  SUPPORTED_TOKENS,
  type TokenId,
  USDC_ADDRESS,
  USDC_E_ADDRESS,
  USDT_ADDRESS
} from '@/constant'
import { useCurrencyStore, useToastStore, useUserDataStore, useTeamStore } from '@/stores'
import ButtonUI from '../ButtonUI.vue'
import TokenAmount from './TokenAmount.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { ERC20_ABI } from '@/artifacts/abi/erc20'
import { waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/wagmi.config'
import {
  useSafeDepositRouterReads,
  useSafeDepositRouterFunctions
} from '@/composables/safeDepositRouter'

const queryClient = useQueryClient()
const chainId = useChainId()

const emits = defineEmits(['closeModal'])
const props = defineProps<{
  safeAddress: Address
  title: string
  useSafeDepositRouter?: boolean
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
const teamStore = useTeamStore()
const { addErrorToast, addSuccessToast } = useToastStore()

// SafeDepositRouter integration (only if prop is true)
const safeDepositRouterAddress = computed(() =>
  props.useSafeDepositRouter ? teamStore.getContractAddressByType('SafeDepositRouter') : undefined
)

const { canDeposit } = useSafeDepositRouterReads(safeDepositRouterAddress)

const { deposit: depositToRouter } = useSafeDepositRouterFunctions()

// Check if we should use SafeDepositRouter for this token
const shouldUseRouter = computed(() => {
  if (!props.useSafeDepositRouter) return false
  if (!safeDepositRouterAddress.value) return false
  if (!canDeposit.value) return false

  // Only use router for USDC, USDC.e, and USDT
  return (
    selectedTokenId.value === 'usdc' ||
    selectedTokenId.value === 'usdc.e' ||
    selectedTokenId.value === 'usdt'
  )
})

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

// Approval target: SafeDepositRouter if using it, otherwise Safe
const approvalTarget = computed(() =>
  shouldUseRouter.value ? safeDepositRouterAddress.value! : props.safeAddress
)

const { data: allowance } = useErc20Allowance(
  selectedTokenAddress,
  userDataStore.address as Address,
  approvalTarget
)

// Computed values for approval composable
const bigIntAmount = computed(() => {
  // Handle NaN case
  return isNaN(Number(amount.value)) ? 0n : BigInt(Number(amount.value) * 1e6)
})

const ERC20ApproveResult = useERC20Approve(selectedTokenAddress, approvalTarget, bigIntAmount)

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
    // Native token deposit
    if (selectedTokenId.value === 'native') {
      await sendTransaction(props.safeAddress, parseEther(amount.value))
      return
    }

    // Check if we should use SafeDepositRouter
    if (shouldUseRouter.value) {
      // SafeDepositRouter workflow
      if (!((allowance.value ?? 0n) >= bigIntAmount.value)) {
        currentStep.value = 2
        await ERC20ApproveResult.executeWrite([safeDepositRouterAddress.value!, bigIntAmount.value])

        if (
          ERC20ApproveResult.receiptResult.error.value ||
          ERC20ApproveResult.writeResult.error.value
        ) {
          throw new Error('Approval failed')
        }
      }

      currentStep.value = 3

      // Deposit via SafeDepositRouter (6 decimals for USDC/USDT)
      await depositToRouter(selectedToken.value!.token.address, amount.value, 6)

      // Invalidate queries
      const tokenAddress = selectedToken.value!.token.address
      const invalidateErc20Balance = (tokenAddr: Address, target: Address) =>
        queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              address: tokenAddr,
              chainId,
              functionName: 'balanceOf',
              args: [target]
            }
          ]
        })

      invalidateErc20Balance(tokenAddress, props.safeAddress)
      invalidateErc20Balance(tokenAddress, userDataStore.address as Address)

      // Invalidate SafeDepositRouter queries
      queryClient.invalidateQueries({
        queryKey: ['safeDepositRouter', safeDepositRouterAddress.value]
      })

      submitting.value = false
      amount.value = ''
      addSuccessToast(
        `${selectedToken.value?.token.code} deposited and SHER tokens minted successfully`
      )
      emits('closeModal')
    } else {
      // Standard USDC/USDT transfer workflow
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

      currentStep.value = 3

      // Transfer to Safe
      let tokenAddress: Address
      if (selectedTokenId.value === 'usdc.e') {
        tokenAddress = USDC_E_ADDRESS as Address
      } else if (selectedTokenId.value === 'usdc') {
        tokenAddress = USDC_ADDRESS as Address
      } else if (selectedTokenId.value === 'usdt') {
        tokenAddress = USDT_ADDRESS as Address
      } else {
        throw new Error('Unsupported token')
      }

      await writeTransfer({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [props.safeAddress, bigIntAmount.value]
      })

      if (!transferHash.value) {
        throw new Error('Transfer transaction not initiated')
      }

      // Wait for transaction confirmation
      await waitForTransactionReceipt(config, { hash: transferHash.value })

      // Invalidate balance queries
      const invalidateErc20Balance = (tokenAddr: Address, target: Address) =>
        queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            {
              address: tokenAddr,
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
