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
          <div class="flex w-full items-center justify-between text-sm font-medium">
            <span>Deposit</span>
            <span class="text-xs text-gray-500 dark:text-gray-400"
              >{{
                selectedToken?.token.symbol ? `${selectedToken.token.symbol} Balance:` : 'Balance:'
              }}
              {{ selectedToken?.amount }} {{ selectedToken?.token.symbol }}
            </span>
          </div>
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

    <div class="mt-6 flex justify-between gap-2">
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
  calculateDepositFromSher,
  buildDepositAmountSchema
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
    guardError.value = null
  }
})
const stepperItems = [
  { title: 'Amount', value: 0 },
  { title: 'Approval', value: 1 },
  { title: 'Deposit', value: 2 }
]

const currentStep = ref(0)
const isAmountValid = ref(false)
const isUpdatingFromSher = ref(false)
const guardError = ref<string | null>(null)

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

const formSchema = computed(() =>
  buildDepositAmountSchema(
    selectedToken.value ? (selectedToken.value.amount ?? 0) : undefined,
    TOKEN_DECIMALS
  )
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
  guardError.value = null
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

// ERC20 Approve composable
const approveWrite = useERC20Approve(selectedTokenAddress)

// Deposit composable — handles cross-contract invalidation (router + InvestorV1)
// internally on success. See useDeposit in safeDepositRouter/writes.ts.
const depositWrite = useDeposit()

// Submitting state derives from the underlying mutations: no manual flag to
// keep in sync, no resets to forget on every error path.
const submitting = computed(() => approveWrite.isPending.value || depositWrite.isPending.value)

const isLoading = computed(
  () => isBalanceLoading.value || isTokenSymbolLoading.value || submitting.value
)

// Errors from the mutations stay reactive on `approveWrite.error.value` /
// `depositWrite.error.value` and surface inline via UAlert. Toasts and modal
// close are handled by per-call onSuccess/onError callbacks so the side
// effects sit next to the action that triggered them.
const errorMessage = computed(() => {
  if (guardError.value) return guardError.value
  const err = (approveWrite.error.value || depositWrite.error.value) as Error | null
  return err ? parseError(err) || err.message || 'Transaction failed' : null
})

watch(multiplierError, (error) => {
  if (error) {
    console.error('Error fetching multiplier:', error)
    toast.add({ title: 'Failed to load SHER compensation rate', color: 'error' })
  }
})

const isUserRejection = (err: unknown) => {
  const msg = parseError(err as Error)
  return msg.includes('User rejected') || msg.includes('User denied')
}

const toastFailure = (err: unknown, fallback: string) => {
  toast.add({
    title: isUserRejection(err) ? 'Transaction cancelled by user' : fallback,
    color: 'error'
  })
}

function reset() {
  amount.value = ''
  sherAmount.value = '0'
  selectedTokenId.value = 'usdc'
  currentStep.value = 0
  isAmountValid.value = false
  isUpdatingFromSher.value = false
  guardError.value = null
}

defineExpose({ reset })

function handleCancel() {
  reset()
  emits('closeModal')
}

const failGuard = (msg: string) => {
  guardError.value = msg
  toast.add({ title: msg, color: 'error' })
}

// Step 2 of the flow: deposit. Called directly when no approval is needed, or
// chained from the approval's onSuccess. The callbacks own the side effects.
const runDeposit = () => {
  currentStep.value = 2
  depositWrite.mutate(
    { args: [selectedTokenAddress.value, bigIntAmount.value] },
    {
      onSuccess: () => {
        toast.add({
          title: `Successfully deposited ${amount.value} ${selectedToken.value?.token.symbol} and minted ${sherAmount.value} ${tokenSymbol.value || 'SHER'} tokens`,
          color: 'success'
        })
        reset()
        emits('closeModal')
      },
      onError: (err) => {
        console.error('Error depositing tokens:', err)
        toastFailure(err, 'Failed to deposit')
        currentStep.value = 0
      }
    }
  )
}

const submitForm = () => {
  if (!isAmountValid.value) return
  if (!safeDepositRouterAddress.value) return failGuard('SafeDepositRouter address not found')
  if (!selectedToken.value) return failGuard('No token selected')
  if (!multiplier.value) return failGuard('Unable to calculate SHER compensation')

  guardError.value = null
  const currentAllowance = (allowance.value as bigint | undefined) ?? 0n

  // Enough allowance already — go straight to the deposit step.
  if (currentAllowance >= bigIntAmount.value) {
    runDeposit()
    return
  }

  // Approve first, then chain the deposit from its onSuccess. A failed approval
  // stops the flow on its own because runDeposit only runs on success, so no
  // wrapping try/catch is needed; the reactive error still surfaces via UAlert.
  currentStep.value = 1
  approveWrite.mutate(
    { args: [safeDepositRouterAddress.value, bigIntAmount.value] },
    {
      onSuccess: () => {
        toast.add({ title: 'Token approval successful', color: 'success' })
        runDeposit()
      },
      onError: (err) => {
        console.error('Error approving tokens:', err)
        toastFailure(err, 'Failed to approve tokens')
        currentStep.value = 0
      }
    }
  )
}
</script>
