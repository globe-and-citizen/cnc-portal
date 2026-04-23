<template>
  <span class="text-2xl font-bold">{{ title || 'Deposit to Team Bank Contract' }}</span>

  <UStepper
    v-if="selectedToken?.token.id !== 'native'"
    :items="stepperItems"
    v-model="currentStep"
    disabled
    class="my-4 w-full"
  />

  <UForm :schema="formSchema" :state="{ amount }" @submit="submitForm">
    <UFormField name="amount" class="w-full">
      <TokenAmount
        :tokens="tokenList"
        v-model="tokenAmountModel"
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
    </UFormField>

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
        :disabled="isLoading || !isAmountValid"
        data-test="deposit-button"
      >
        {{
          selectedToken?.token.id !== 'native' && currentStep === 1
            ? 'Approval'
            : currentStep === 2
              ? 'Deposit'
              : 'Deposit'
        }}
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import { parseEther, zeroAddress, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useSafeSendTransaction } from '@/composables/transactions/useSafeSendTransaction'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { useDepositToken } from '@/composables/bank/writes'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { useCurrencyStore, useUserDataStore } from '@/stores'
import TokenAmount from './TokenAmount.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'

const queryClient = useQueryClient()
const chainId = useChainId()

const emits = defineEmits(['closeModal'])
const props = defineProps<{
  bankAddress: Address
  title?: string
}>()

function reset() {
  amount.value = ''
  selectedTokenId.value = 'native'
  currentStep.value = 0
  submitting.value = false
  isAmountValid.value = false
  submitError.value = null
}

defineExpose({ reset })

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('native')
const tokenAmountModel = computed({
  get: () => ({ amount: amount.value, tokenId: selectedTokenId.value }),
  set: (value: { amount: string; tokenId: TokenId | string }) => {
    amount.value = value.amount ?? ''
    selectedTokenId.value = (value.tokenId as TokenId) ?? 'native'
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
const submitError = ref<string | null>(null)

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const toast = useToast()

// Reactive state for balances
const { balances, isLoading } = useContractBalance(userDataStore.address as Address)

// Native token deposit using safe transaction handler
const nativeDeposit = useSafeSendTransaction({
  to: computed(() => props.bankAddress)
})

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

const allowanceValue = computed<bigint>(() =>
  typeof allowance.value === 'bigint' ? allowance.value : 0n
)

const bigIntAmount = computed(() => {
  const numericAmount = Number(amount.value)
  if (!Number.isFinite(numericAmount)) return 0n
  return BigInt(Math.floor(numericAmount * 1e6))
})

const ERC20ApproveResult = useERC20Approve(
  selectedTokenAddress,
  computed(() => props.bankAddress),
  bigIntAmount
)

const bankDepositTokenResult = useDepositToken()

const formSchema = computed(() =>
  z.object({
    amount: z
      .string()
      .trim()
      .min(1, 'Amount is required.')
      .refine((value) => {
        if (!/^(?:\d+\.?\d*|\.\d+)$/.test(value)) return false
        const numericAmount = Number(value)
        return Number.isFinite(numericAmount) && numericAmount > 0
      }, 'Enter a valid amount greater than 0.')
      .refine((value) => {
        if (!selectedToken.value) return true
        return Number(value) <= (selectedToken.value.amount ?? 0)
      }, 'Amount exceeds available balance.')
      .refine((value) => {
        if (!selectedToken.value || selectedToken.value.token.id === 'native') return true
        const [, fractionalPart = ''] = value.split('.')
        if (fractionalPart.length > 6) return false
        return Math.floor(Number(value) * 1e6) >= 1
      }, 'Enter a valid token amount with up to 6 decimal places.')
  })
)

const errorMessage = computed(() => submitError.value)

const handleCancel = () => {
  reset()
  emits('closeModal')
}

const submitForm = async () => {
  if (!isAmountValid.value) return
  if (nativeDeposit.isPending.value) return
  submitting.value = true
  submitError.value = null
  try {
    if (selectedTokenId.value === 'native') {
      await nativeDeposit.mutateAsync({ value: parseEther(amount.value) })
      amount.value = ''
      toast.add({
        title: `${selectedToken.value?.token.code} deposited successfully`,
        color: 'success'
      })
      emits('closeModal')
    } else {
      if (!(allowanceValue.value >= bigIntAmount.value)) {
        currentStep.value = 1

        await ERC20ApproveResult.executeWrite([props.bankAddress, bigIntAmount.value])
        if (
          ERC20ApproveResult.receiptResult.error.value ||
          ERC20ApproveResult.writeResult.error.value
        ) {
          throw new Error('Approval failed')
        }
      }
      currentStep.value = 2
      await bankDepositTokenResult.mutateAsync({
        args: [selectedTokenAddress.value, bigIntAmount.value]
      })

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

      invalidateErc20Balance(selectedTokenAddress.value, props.bankAddress)

      submitting.value = false
      amount.value = ''
      toast.add({
        title: `${selectedToken.value?.token.code} deposited successfully`,
        color: 'success'
      })
      emits('closeModal')
    }
  } catch (error) {
    const message =
      (error as { shortMessage?: string; message?: string })?.shortMessage ??
      (error as Error)?.message ??
      `Failed to deposit ${selectedTokenId.value}`
    submitError.value = message
    submitting.value = false
  }
}
</script>
