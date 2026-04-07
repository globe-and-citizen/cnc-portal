<template>
  <span class="text-2xl font-bold">{{ title || 'Deposit to Team Bank Contract' }}</span>

  <UStepper
    v-if="selectedToken?.token.id !== 'native'"
    :items="stepperItems"
    v-model="currentStep"
    disabled
    class="my-4 w-full"
  />

  <!-- New Token Amount Component -->
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
  <div class="modal-action justify-between">
    <UButton
      color="error"
      variant="outline"
      @click="
        () => {
          reset()
          $emit('closeModal')
        }
      "
      data-test="cancel-button"
      label="Cancel"
    />
    <UButton
      color="primary"
      @click="submitForm"
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
    />  -->
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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

// import { formatDataForDisplay, parseError } from '@/utils'
// import TransactionTimeline from '../ui/TransactionTimeline.vue'

const queryClient = useQueryClient()
const chainId = useChainId()

const emits = defineEmits(['closeModal'])
// Add validation event
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
}

defineExpose({ reset })

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('native') // Default to native token (ETH)
const tokenAmountModel = computed({
  get: () => ({ amount: amount.value, tokenId: selectedTokenId.value }),
  set: (value: { amount: string; tokenId: TokenId | string }) => {
    amount.value = value.amount ?? ''
    selectedTokenId.value = (value.tokenId as TokenId) ?? 'native'
  }
})
const stepperItems = [
  { title: 'Amount', value: 0 },
  { title: 'Approval', value: 1 },
  { title: 'Deposit', value: 2 }
]

const currentStep = ref(0)
const submitting = ref(false)
const isAmountValid = ref(false) // Validation state used by TokenAmount component

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const toast = useToast()

// Reactive state for balances: composable that fetches address balances
const { balances, isLoading } = useContractBalance(userDataStore.address as Address)

// Native token deposit using safe transaction handler
const nativeDeposit = useSafeSendTransaction({
  to: computed(() => props.bankAddress)
})

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

const allowanceValue = computed<bigint>(() =>
  typeof allowance.value === 'bigint' ? allowance.value : 0n
)

// Computed values for approval composable
const bigIntAmount = computed(() => BigInt(Math.floor(Number(amount.value) * 1e6)))

const ERC20ApproveResult = useERC20Approve(
  selectedTokenAddress,
  computed(() => props.bankAddress),
  bigIntAmount
)

const bankDepositTokenResult = useDepositToken()

// Methods

const submitForm = async () => {
  if (!isAmountValid.value) return // Validation check
  if (nativeDeposit.isPending.value) return // Prevent multiple submissions
  submitting.value = true
  try {
    // Deposit of native token (ETH/POL...)
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

        // Run spending cap
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
  } catch {
    // console.error(error)
    toast.add({ title: `Failed to deposit ${selectedTokenId.value}`, color: 'error' })
    submitting.value = false
    // currentStep.value = 1
  }
}
</script>
