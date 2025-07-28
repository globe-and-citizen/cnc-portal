<template>
  <span class="font-bold text-2xl">Deposit to Team Bank Contract</span>

  <div v-if="selectedToken?.token.id !== 'native'" class="steps w-full my-4">
    <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Amount</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 2 }">Approval</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 3 }">Deposit</a>
  </div>

  <label class="form-control w-full" :class="{ 'mt-4': selectedToken?.token.id !== 'native' }">
    <div class="label">
      <span class="label-text">Deposit</span>
      <span class="label-text-alt">Balance: {{ selectedToken?.amount }}</span>
    </div>
    <div class="input input-bordered flex items-center">
      <input
        type="text"
        class="grow"
        placeholder="0"
        v-model="amount"
        data-test="amountInput"
        @input="handleAmountInput"
      />

      <div class="flex gap-1">
        <button
          v-for="percent in [25, 50, 75]"
          :key="percent"
          class="btn btn-xs btn-ghost cursor-pointer"
          @click="usePercentageOfBalance(percent)"
          :data-test="`percentButton-${percent}`"
        >
          {{ percent }}%
        </button>
      </div>
      <button
        class="btn btn-xs btn-ghost mr-2"
        @click="useMaxBalance"
        :disabled="isLoading"
        data-test="maxButton"
      >
        Max
      </button>
      <div>
        <SelectComponent
          :options="
            tokenList.map((token) => ({
              label: token.symbol,
              value: token.tokenId
            }))
          "
          :disabled="isLoading"
          @change="
            (value) => {
              selectedTokenId = value
            }
          "
          :format-value="
            (value: string) => {
              return value === 'SepoliaETH' ? 'SepETH' : value
            }
          "
        />
      </div>
    </div>
    <div class="label">
      <!-- Estimated Price in selected currency -->
      <span class="label-text" v-if="amount && parseFloat(amount) > 0">
        ≈ {{ estimatedPrice }}
      </span>
      <div class="pl-4 text-red-500 text-sm" v-for="error in $v.amount.$errors" :key="error.$uid">
        {{ error.$message }}
      </div>
    </div>
  </label>

  <div class="modal-action justify-center">
    <ButtonUI
      variant="primary"
      @click="submitForm"
      :loading="submitting"
      :disabled="isLoading || $v.amount.$invalid"
    >
      Deposit
    </ButtonUI>
    <ButtonUI variant="error" outline @click="$emit('closeModal')">Cancel</ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import BankABI from '@/artifacts/abi/bank.json'

import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'

import SelectComponent from '@/components/SelectComponent.vue'
import ButtonUI from '../ButtonUI.vue'

import { useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { parseEther, type Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'

import { formatCurrencyShort } from '@/utils/currencyUtil'

const emits = defineEmits(['closeModal'])
const props = defineProps<{
  loading?: boolean
  loadingText?: string
  bankAddress: Address
}>()

// Component state
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('native') // Default to native token (ETH)
const depositAmount = ref<string>('')
const currentStep = ref(1)
const submitting = ref(false)

// Stores
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const { addErrorToast, addSuccessToast } = useToastStore()

// Reactive state for balances: composable that fetches address balances
const { balances, isLoading } = useContractBalance(userDataStore.address as Address)

// Native token desposit
const { sendTransactionAsync: sendTransaction, data: depositHash } = useSendTransaction()

// Wait for transaction receipt for Native token deposit
const { status: nativeTokenDespositStatus } = useWaitForTransactionReceipt({
  hash: depositHash
})

// Write contract for ERC20 token deposit
const { writeContractAsync: writeTokenDeposit, data: tokenDepositHash } = useWriteContract()

// Wait for transaction receipt for ERC20 token deposit
const { status: erc20TokenDespositStatus } = useWaitForTransactionReceipt({
  hash: tokenDepositHash
})

// Write contract for ERC20 token spend cap approval
const {
  writeContractAsync: approve,
  // isPending: isPendingApprove,
  data: approveHash
} = useWriteContract()

// Wait for transaction receipt for ERC20 token spend cap approval
const { status: erc20ApprovaleSatus } = useWaitForTransactionReceipt({
  hash: approveHash
})

// Computed properties
// Token list derived from SUPPORTED_TOKENS
const tokenList = computed(() =>
  SUPPORTED_TOKENS.map((token) => ({
    symbol: token.symbol,
    tokenId: token.id,
    name: token.name
  }))
)

// computed propertie for selected token
const selectedToken = computed(() =>
  balances.value.find((b) => b.token.id === selectedTokenId.value)
)
// TODO, toFixed(4) is giving sometimes a value > to the actual balance, need to fix this
const estimatedPrice = computed(() => {
  const tokenInfo = currencyStore.getTokenInfo(selectedTokenId.value)
  const priceObj = tokenInfo?.prices.find((p) => p.id === 'local')
  const price = priceObj?.price ?? 0
  const value = (Number(amount.value) || 0) * price
  return formatCurrencyShort(value, priceObj?.code ?? 'USD')
})

// Methods

/**
 * Utility function to wait for a condition to be met
 * @description This function repeatedly checks a condition until it returns true or a timeout occurs.
 * @param condition () => boolean - A function that returns a boolean indicating whether the condition is met.
 * @param timeout
 */
const waitForCondition = (condition: () => boolean, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      console.log('Checking condition...')
      if (condition()) {
        clearInterval(interval)
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval)
        reject(new Error('Condition not met within timeout'))
      }
    }, 1000)
  })
}
const useMaxBalance = () => {
  amount.value = selectedToken.value?.amount.toString() ?? '0.00'
}
const usePercentageOfBalance = (percentage: number) => {
  amount.value = (((selectedToken.value?.amount ?? 0) * percentage) / 100).toFixed(4)
}

// Validation rules
const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const notExceedingBalance = helpers.withMessage('Amount exceeds your balance', (value: string) => {
  if (!value || parseFloat(value) <= 0) return true
  const amountValue = selectedToken.value?.amount ?? 0
  return parseFloat(value) <= amountValue
})

// const validDecimals = helpers.withMessage(
//   'Amount must have at most 4 decimal places',
//   (value: string) => {
//     if (!value) return true
//     const parts = value.split('.')
//     return parts.length === 1 || parts[1].length <= 4
//   }
// )

const rules = {
  amount: {
    required,
    numeric,
    notZero,
    notExceedingBalance
    // validDecimals
  }
}

const $v = useVuelidate(rules, { amount })

const submitForm = async () => {
  await $v.value.$touch()
  if ($v.value.$invalid) return
  submitting.value = true
  try {
    if (selectedTokenId.value === 'native') {
      await sendTransaction({
        to: props.bankAddress,
        value: parseEther(amount.value)
      })

      await waitForCondition(() => nativeTokenDespositStatus.value === 'success', 15000)
      addSuccessToast(`${selectedToken.value?.token.code} deposited successfully`)
      emits('closeModal')
      depositAmount.value = '' // Clear stored amount
    } else {
      const tokenAmount = BigInt(Number(amount.value) * 1e6)
      depositAmount.value = amount.value // Store amount for after approval

      if (selectedToken.value) {
        const allowance = await readContract(config, {
          address: selectedToken.value.token.address as Address,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [userDataStore.address as Address, props.bankAddress]
        })

        const currentAllowance = allowance ? allowance.toString() : 0n
        if (Number(currentAllowance) < Number(tokenAmount)) {
          // If allowance is less than token amount, approve the token
          currentStep.value = 2
          await approve({
            address: selectedToken.value.token.address as Address,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [props.bankAddress, tokenAmount]
          })

          // wait for 3s, timeout for approval transaction
          await new Promise((resolve) => setTimeout(resolve, 3000))

          await waitForCondition(() => erc20ApprovaleSatus.value === 'success', 15000)

          // wait for transaction receipt
          addSuccessToast('Token approved successfully')
        }

        // Directly deposit the token
        currentStep.value = 3
        await writeTokenDeposit({
          address: props.bankAddress,
          abi: BankABI,
          functionName: 'depositToken',
          args: [selectedToken.value.token.address as Address, tokenAmount]
        })
        // TODO wait for transaction receipt

        await waitForCondition(() => erc20TokenDespositStatus.value === 'success', 15000)
        depositAmount.value = ''
        addSuccessToast('USDC deposited successfully')
        emits('closeModal')
      } else {
        addErrorToast('Selected token is not valid')
      }
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to deposit ${selectedTokenId.value}`)
  }

  submitting.value = false
  currentStep.value = 1
}

const handleAmountInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) {
    amount.value = parts[0] + '.' + parts.slice(1).join('')
  } else {
    amount.value = value
  }
}

watch(amount, () => {
  $v.value.$touch()
})
</script>
