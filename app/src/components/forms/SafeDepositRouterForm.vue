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
import { useCurrencyStore, useToastStore, useUserDataStore, useTeamStore } from '@/stores'
import ButtonUI from '../ButtonUI.vue'
import TokenAmount from './TokenAmount.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'
import { useSafeDepositRouterFunctions } from '@/composables/safeDepositRouter'

const queryClient = useQueryClient()
const chainId = useChainId()

const emits = defineEmits<{
  closeModal: []
}>()

interface Props {
  safeAddress: Address
}

const props = defineProps<Props>()

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('usdc')
const currentStep = ref(1)
const submitting = ref(false)
const isAmountValid = ref(false)

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const teamStore = useTeamStore()
const { addErrorToast, addSuccessToast } = useToastStore()

// SafeDepositRouter composables
const safeDepositRouterAddress = computed(() =>
  teamStore.getContractAddressByType('SafeDepositRouter')
)

const { deposit: depositToRouter, isLoading: isWriteLoading } = useSafeDepositRouterFunctions()

// Reactive state for balances
const { balances, isLoading: isBalanceLoading } = useContractBalance(
  userDataStore.address as Address
)

const isLoading = computed(() => isBalanceLoading.value || isWriteLoading.value)

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
const ERC20ApproveResult = useERC20Approve(
  selectedTokenAddress,
  safeDepositRouterAddress as unknown as Address,
  bigIntAmount
)

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

  try {
    // Step 1: Approve if needed
    const currentAllowance = (allowance.value as bigint | undefined) ?? 0n
    if (currentAllowance < bigIntAmount.value) {
      currentStep.value = 2
      await ERC20ApproveResult.executeWrite([safeDepositRouterAddress.value, bigIntAmount.value])

      if (
        ERC20ApproveResult.receiptResult.error.value ||
        ERC20ApproveResult.writeResult.error.value
      ) {
        throw new Error('Approval failed')
      }
    }

    // Step 2: Deposit via SafeDepositRouter
    currentStep.value = 3
    await depositToRouter(selectedToken.value.token.address, amount.value, TOKEN_DECIMALS)

    // Invalidate relevant queries
    const tokenAddr = selectedToken.value.token.address

    queryClient.invalidateQueries({
      queryKey: [
        'readContract',
        { address: tokenAddr, chainId, functionName: 'balanceOf', args: [props.safeAddress] }
      ]
    })
    queryClient.invalidateQueries({
      queryKey: [
        'readContract',
        {
          address: tokenAddr,
          chainId,
          functionName: 'balanceOf',
          args: [userDataStore.address]
        }
      ]
    })
    queryClient.invalidateQueries({
      queryKey: ['safeDepositRouter', safeDepositRouterAddress.value]
    })

    addSuccessToast('USDC deposited and SHER tokens minted successfully')
    reset()
    emits('closeModal')
  } catch (error) {
    console.error('Deposit to router failed:', error)
    addErrorToast('Failed to deposit. Please try again.')
    submitting.value = false
  }
}

// Reset step when amount changes
watch(amount, () => {
  currentStep.value = 1
})
</script>
