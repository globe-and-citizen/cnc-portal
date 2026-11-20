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
      <TokenAmountInput
        :tokens="tokenList"
        v-model="tokenAmountModel"
        :isLoading="isLoading"
        :max-amount="maxAmountInput"
        @validation="isAmountValid = $event"
      >
        <template #label>
          <span class="text-sm font-medium">Deposit</span>
          <span class="text-xs text-gray-500"
            >Balance: {{ selectedToken?.amount }} {{ selectedToken?.token.symbol }}</span
          >
        </template>
      </TokenAmountInput>
    </UFormField>

    <template v-if="hasTransferFee">
      <UCheckbox
        v-model="shouldAddFee"
        label="Add fee"
        description="So a later transfer of this amount arrives in full."
        class="mt-4"
        data-test="add-fee-checkbox"
      />
      <dl
        v-if="shouldAddFee && enteredAmount > 0n"
        class="bg-elevated mt-3 space-y-1 rounded-md p-3 text-sm"
        data-test="deposit-fee-summary"
      >
        <div class="text-muted flex justify-between">
          <dt>Amount</dt>
          <dd>{{ formatDepositUnits(enteredAmount) }}</dd>
        </div>
        <div class="text-muted flex justify-between">
          <dt>Transfer fee ({{ formatPercent(feeRatio) }})</dt>
          <dd data-test="deposit-fee-amount">{{ formatDepositUnits(feeAmount) }}</dd>
        </div>
        <div class="border-default flex justify-between border-t pt-1 font-medium">
          <dt>You deposit</dt>
          <dd data-test="deposit-total-amount">{{ formatDepositUnits(depositAmount) }}</dd>
        </div>
      </dl>
    </template>

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
      <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
        <UButton
          color="primary"
          type="submit"
          :loading="submitting"
          :disabled="isLoading || submitting || archivedDisabled"
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
      </TeamArchivedTooltip>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { type Address, formatUnits, zeroAddress } from 'viem'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { computed, ref, watch } from 'vue'
import { contractBalanceKeys, useContractBalance } from '@/composables/useContractBalance'
import { formatPercent, formatTokenUnits } from '@/utils/format'
import { isPositiveDecimal, useBankDepositFee } from '@/composables/bank/useBankDepositFee'
import { useCurrencyStore, useUserDataStore } from '@/stores'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import TokenAmountInput from '@/components/ui/inputs/TokenAmountInput.vue'
import { bankEventKeys } from '@/composables/bank/useBankEventsViaLogs'
import { useChainId } from '@wagmi/vue'
import { useDepositToken } from '@/composables/bank/writes'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useErc20Allowance } from '@/composables/erc20/reads'
import { useQueryClient } from '@tanstack/vue-query'
import { useSafeSendTransaction } from '@/composables/transactions/useSafeSendTransaction'
import { z } from 'zod'

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
  shouldAddFee.value = false
}

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
const { data: balance, isLoading } = useContractBalance(userDataStore.address as Address)
const balances = computed(() => balance.value?.balances ?? [])

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

const selectedTokenConfig = computed(() =>
  SUPPORTED_TOKENS.find((token) => token.id === selectedTokenId.value)
)
const selectedDecimals = computed(() => selectedTokenConfig.value?.decimals ?? 18)
const {
  shouldAddFee,
  hasTransferFee,
  feeRatio,
  enteredAmount,
  feeAmount,
  depositAmount,
  maxEnteredAmount
} = useBankDepositFee(amount, selectedTokenConfig)

const formatDepositUnits = (units: bigint) =>
  formatTokenUnits(units, selectedDecimals.value, selectedTokenConfig.value?.symbol ?? '', {
    maxDecimals: 6
  })

/** Exact "Max" input: the whole balance, or less when Add fee must also fit the fee. */
const maxAmountInput = computed(() =>
  formatUnits(maxEnteredAmount(selectedToken.value?.raw ?? 0n), selectedDecimals.value)
)

/** A Max selection follows its ceiling when Add fee is toggled, so it never overshoots. */
watch(maxAmountInput, (nextMax, previousMax) => {
  if (amount.value === previousMax) amount.value = nextMax
})

const ERC20ApproveResult = useERC20Approve(selectedTokenAddress)

const bankDepositTokenResult = useDepositToken()

const formSchema = computed(() =>
  z.object({
    amount: z
      .string()
      .trim()
      .min(1, 'Amount is required.')
      .refine(isPositiveDecimal, 'Enter a valid amount greater than 0.')
      .refine(() => {
        if (!selectedToken.value) return true
        return depositAmount.value <= selectedToken.value.raw
      }, 'Amount exceeds available balance.')
      .refine((value) => {
        if (!selectedToken.value || selectedToken.value.token.id === 'native') return true
        const [, fractionalPart = ''] = value.split('.')
        return fractionalPart.length <= 6
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
      await nativeDeposit.mutateAsync({ value: depositAmount.value })
      await queryClient.invalidateQueries({
        queryKey: contractBalanceKeys.detail(props.bankAddress, chainId.value)
      })
      void queryClient.invalidateQueries({ queryKey: bankEventKeys.all })
      amount.value = ''
      toast.add({
        title: `${selectedToken.value?.token.code} deposited successfully`,
        color: 'success'
      })
      emits('closeModal')
    } else {
      if (!(allowanceValue.value >= depositAmount.value)) {
        currentStep.value = 1

        // Run spending cap
        await ERC20ApproveResult.mutateAsync({
          args: [props.bankAddress, depositAmount.value]
        })
      }
      currentStep.value = 2
      await bankDepositTokenResult.mutateAsync({
        args: [selectedTokenAddress.value, depositAmount.value]
      })

      // The Bank's native and ERC-20 amounts share one query per contract, so
      // one key refreshes what the deposit changed. `chainId` is a ref — it has
      // to be unwrapped, or the key never matches anything.
      await queryClient.invalidateQueries({
        queryKey: contractBalanceKeys.detail(props.bankAddress, chainId.value)
      })
      void queryClient.invalidateQueries({ queryKey: bankEventKeys.all })

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
