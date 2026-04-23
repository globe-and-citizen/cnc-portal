<template>
  <span class="text-2xl font-bold">Invest in Safe &amp; Earn {{ tokenSymbol || 'SHER' }}</span>

  <UStepper :items="stepperItems" v-model="currentStep" disabled class="my-4 w-full" />

  <UForm :schema="formSchema" :state="{ amount }" @submit="submitForm">
    <UFormField name="amount" class="w-full">
      <TokenAmount
        :tokens="tokenList"
        v-model="tokenAmountModel"
        :isLoading="isLoading"
        @validation="isAmountValid = $event"
        data-test="token-amount"
      >
        <template #label>
          <span class="label-text">Deposit</span>
          <span class="label-text-alt"
            >{{
              selectedToken?.token.symbol ? `${selectedToken.token.symbol} Balance:` : 'Balance:'
            }}
            {{ selectedToken?.amount }} {{ selectedToken?.token.symbol }}
          </span>
        </template>
      </TokenAmount>
    </UFormField>

    <CompensationAmount
      v-model:modelValue="sherAmount"
      :deposit-token-symbol="selectedToken?.token.symbol || 'USDC'"
      :rate="formattedMultiplier"
      :disabled="isLoading || !multiplier"
      @update:modelValue="handleSherAmountChange"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
      class="mt-3"
      data-test="error-alert"
    />

    <div class="modal-action justify-between">
      <UButton
        color="error"
        variant="outline"
        type="button"
        data-test="cancel-button"
        label="Cancel"
        @click="handleCancel"
      />
      <UButton
        color="primary"
        type="submit"
        :loading="submitting"
        :disabled="isLoading || !isAmountValid || !safeDepositRouterAddress"
        data-test="deposit-button"
      >
        {{ currentStep === 1 ? 'Approve' : `Deposit & Earn ${tokenSymbol || 'SHER'}` }}
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { z } from 'zod'
import { parseUnits, zeroAddress, type Address } from 'viem'

import { useContractBalance } from '@/composables/useContractBalance'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { useCurrencyStore, useUserDataStore } from '@/stores'
import { parseError } from '@/utils'
import {
  formatSafeDepositRouterMultiplier,
  calculateSherCompensation,
  calculateDepositFromSher
} from '@/utils/safeDepositRouterUtil'
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

const amount = ref<string>('')
const sherAmount = ref<string>('0')
const selectedTokenId = ref<TokenId>('usdc')
const tokenAmountModel = computed({
  get: () => ({ amount: amount.value, tokenId: selectedTokenId.value }),
  set: (value: { amount: string; tokenId: TokenId | string }) => {
    amount.value = value.amount ?? ''
    selectedTokenId.value = (value.tokenId as TokenId) ?? 'usdc'
    submitError.value = null
  }
})
const stepperItems = [
  { title: 'Amount', value: 0 },
  { title: 'Approval', value: 1 },
  { title: 'Deposit', value: 2 }
]

const currentStep = ref(0)
const submitting = ref(false)
const isAmountValid = ref(false)
const isUpdatingFromSher = ref(false)
const submitError = ref<string | null>(null)

const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const toast = useToast()

const safeDepositRouterAddress = useSafeDepositRouterAddress()
const { data: multiplier, error: multiplierError } = useSafeDepositRouterMultiplier()
const { data: tokenSymbol, isLoading: isTokenSymbolLoading } = useInvestorSymbol()

const formattedMultiplier = computed(() =>
  formatSafeDepositRouterMultiplier(
    typeof multiplier.value === 'bigint' ? multiplier.value : undefined
  )
)

const multiplierNumber = computed(() => parseFloat(formattedMultiplier.value) || 0)

const { balances, isLoading: isBalanceLoading } = useContractBalance(
  userDataStore.address as Address
)

const ROUTER_SUPPORTED_TOKENS: TokenId[] = ['usdc']

const tokenList = computed(() =>
  SUPPORTED_TOKENS.filter((t) => ROUTER_SUPPORTED_TOKENS.includes(t.id as TokenId)).map((t) => ({
    symbol: t.symbol,
    tokenId: t.id,
    name: t.name,
    code: t.code,
    balance: balances.value.find((b) => b.token.id === t.id)?.amount ?? 0,
    price: currencyStore.getTokenPrice(t.id)
  }))
)

const selectedToken = computed(() =>
  balances.value.find((b) => b.token.id === selectedTokenId.value)
)

const selectedTokenAddress = computed<Address>(
  () => selectedToken.value?.token.address ?? zeroAddress
)

const TOKEN_DECIMALS = 6
const bigIntAmount = computed<bigint>(() => {
  if (!amount.value || isNaN(Number(amount.value))) return 0n
  try {
    return parseUnits(amount.value, TOKEN_DECIMALS)
  } catch {
    return 0n
  }
})

const isValidDecimals = (value: string) => {
  const [, fractionalPart = ''] = value.split('.')
  if (fractionalPart.length > TOKEN_DECIMALS) return false
  try {
    return parseUnits(value, TOKEN_DECIMALS) > 0n
  } catch {
    return false
  }
}

const formSchema = computed(() =>
  z.object({
    amount: z
      .string()
      .trim()
      .min(1, 'Amount is required.')
      .refine(
        (value) => /^(?:\d+\.?\d*|\.\d+)$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0,
        'Enter a valid amount greater than 0.'
      )
      .refine(
        (value) => !selectedToken.value || Number(value) <= (selectedToken.value.amount ?? 0),
        'Amount exceeds available balance.'
      )
      .refine(isValidDecimals, `Enter a valid token amount with up to ${TOKEN_DECIMALS} decimal places.`)
  })
)

const handleSherAmountChange = (value: string) => {
  sherAmount.value = value
  if (value === '' || value === '0') {
    isUpdatingFromSher.value = true
    amount.value = '0'
    return
  }
  const numericValue = parseFloat(value)
  if (isNaN(numericValue) || numericValue < 0) return
  if (multiplierNumber.value > 0) {
    isUpdatingFromSher.value = true
    amount.value = calculateDepositFromSher(value, multiplierNumber.value, TOKEN_DECIMALS)
  }
}

watch(amount, (newAmount) => {
  currentStep.value = 0
  submitError.value = null
  if (isUpdatingFromSher.value) {
    isUpdatingFromSher.value = false
    return
  }
  sherAmount.value = calculateSherCompensation(newAmount, multiplierNumber.value, TOKEN_DECIMALS)
})

watch(multiplierNumber, (newMultiplier) => {
  sherAmount.value = calculateSherCompensation(amount.value, newMultiplier, TOKEN_DECIMALS)
})

const { data: allowance } = useErc20Allowance(
  selectedTokenAddress,
  userDataStore.address as Address,
  safeDepositRouterAddress as unknown as Address
)
const approveWrite = useERC20Approve(
  selectedTokenAddress,
  safeDepositRouterAddress as unknown as Address,
  bigIntAmount
)
const depositWrite = useDeposit()

const isLoading = computed(
  () =>
    isBalanceLoading.value ||
    isTokenSymbolLoading.value ||
    approveWrite.writeResult.isPending.value ||
    depositWrite.writeResult.isPending.value
)

const errorMessage = computed(() => {
  if (submitError.value) return submitError.value
  const err = (approveWrite.writeResult.error.value ||
    approveWrite.receiptResult.error.value ||
    depositWrite.writeResult.error.value ||
    depositWrite.receiptResult.error.value) as Error | null
  return err ? parseError(err) || err.message || 'Transaction failed' : null
})

const handleWriteError = (fallbackTitle: string) => (error: Error | null) => {
  if (!error) return
  console.error(fallbackTitle, error)
  const errorMsg = parseError(error)
  const title =
    errorMsg.includes('User rejected') || errorMsg.includes('User denied')
      ? 'Transaction cancelled by user'
      : fallbackTitle
  toast.add({ title, color: 'error' })
  submitting.value = false
  currentStep.value = 0
}

watch(multiplierError, (error) => {
  if (error) {
    console.error('Error fetching multiplier:', error)
    toast.add({ title: 'Failed to load SHER compensation rate', color: 'error' })
  }
})

watch(() => approveWrite.writeResult.error.value, handleWriteError('Failed to approve tokens'))
watch(() => depositWrite.writeResult.error.value, handleWriteError('Failed to deposit'))

watch(
  () => approveWrite.receiptResult.isSuccess.value,
  (success) => {
    if (!success) return
    toast.add({ title: 'Token approval successful', color: 'success' })
    currentStep.value = 2
    performDeposit()
  }
)

watch(
  () => depositWrite.receiptResult.isSuccess.value,
  (success) => {
    if (!success) return
    toast.add({
      title: `Successfully deposited ${amount.value} ${selectedToken.value?.token.symbol} and minted ${sherAmount.value} ${tokenSymbol.value || 'SHER'} tokens`,
      color: 'success'
    })
    reset()
    emits('closeModal')
  }
)

function reset() {
  amount.value = ''
  sherAmount.value = '0'
  selectedTokenId.value = 'usdc'
  currentStep.value = 0
  submitting.value = false
  isAmountValid.value = false
  isUpdatingFromSher.value = false
  submitError.value = null
}

defineExpose({ reset })

function handleCancel() {
  reset()
  emits('closeModal')
}

async function performDeposit() {
  await depositWrite
    .executeWrite(selectedTokenAddress.value, bigIntAmount.value)
    .catch((error) => console.error('Deposit execution error:', error))
}

const failGuard = (msg: string) => {
  submitError.value = msg
  toast.add({ title: msg, color: 'error' })
}

const submitForm = async () => {
  if (!isAmountValid.value) return
  if (!safeDepositRouterAddress.value) return failGuard('SafeDepositRouter address not found')
  if (!selectedToken.value) return failGuard('No token selected')
  if (!multiplier.value) return failGuard('Unable to calculate SHER compensation')

  submitError.value = null
  submitting.value = true
  const currentAllowance = (allowance.value as bigint | undefined) ?? 0n
  if (currentAllowance < bigIntAmount.value) {
    currentStep.value = 1
    await approveWrite
      .executeWrite([safeDepositRouterAddress.value, bigIntAmount.value])
      .catch((error) => console.error('Approve execution error:', error))
  } else {
    currentStep.value = 2
    await performDeposit()
  }
}
</script>
