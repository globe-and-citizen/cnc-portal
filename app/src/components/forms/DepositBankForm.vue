<template>
  <span class="font-bold text-2xl">Deposit to Team Bank Contract</span>

  <div v-if="tokenList[selectedTokenId].symbol === 'USDC'" class="steps w-full my-4">
    <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Amount</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 2 }">Approval</a>
    <a class="step" :class="{ 'step-primary': currentStep >= 3 }">Deposit</a>
  </div>

  <label
    class="form-control w-full"
    :class="{ 'mt-4': tokenList[selectedTokenId].symbol !== 'USDC' }"
  >
    <div class="label">
      <span class="label-text">Deposit</span>
      <span class="label-text-alt">Balance: {{ formattedBalance }}</span>
    </div>
    <div class="input input-lg input-bordered flex items-center">
      <input
        type="text"
        class="grow"
        placeholder="0"
        v-model="amount"
        data-test="amountInput"
        @input="handleAmountInput"
      />
      <button class="btn btn-sm btn-ghost mr-2" @click="useMaxBalance" :disabled="isLoadingBalance">
        Max
      </button>
      <div>
        <div
          role="button"
          class="flex items-center cursor-pointer gap-4 badge badge-lg badge-info"
          @click="
            () => {
              isDropdownOpen = !isDropdownOpen
              console.log(`Dropdown open: ${isDropdownOpen}`)
            }
          "
        >
          <span class="">{{ tokenList[selectedTokenId].name }} </span>
          <IconifyIcon icon="heroicons-outline:chevron-down" class="w-4 h-4" />
        </div>
        <ul
          class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] w-52 p-2 shadow"
          ref="target"
          v-if="isDropdownOpen"
        >
          <li
            v-for="(token, id) in tokenList"
            :key="id"
            @click="
              () => {
                selectedTokenId = id
                isDropdownOpen = false
              }
            "
          >
            <a>{{ token.name }}</a>
          </li>
        </ul>
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
      :loading="isLoading"
      :disabled="isLoading || $v.amount.$invalid"
    >
      Deposit
    </ButtonUI>
    <ButtonUI variant="error" outline @click="$emit('closeModal')">Cancel</ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { ref, onMounted, computed, watch } from 'vue'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useCryptoPrice } from '@/composables/useCryptoPrice'
import {
  useBalance,
  useChainId,
  useReadContract,
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt
} from '@wagmi/vue'
import { useUserDataStore } from '@/stores/user'
import { formatEther, type Address, parseEther } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import BankABI from '@/artifacts/abi/bank.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { useToastStore } from '@/stores/useToastStore'

const props = defineProps<{
  loading?: boolean
  loadingText?: string
  bankAddress: Address
}>()

const { addErrorToast, addSuccessToast } = useToastStore()

// Component state
const amount = ref<string>('')
const selectedTokenId = ref(0)
const isDropdownOpen = ref<boolean>(false)
const depositAmount = ref<string>('')
const currencyStore = useCurrencyStore()
const { price: usdcPrice } = useCryptoPrice('usd-coin')
const userDataStore = useUserDataStore()
const chainId = useChainId()

// Contract interactions
const { sendTransaction, isPending: depositLoading, data: depositHash } = useSendTransaction()

const { isLoading: isConfirmingDeposit } = useWaitForTransactionReceipt({
  hash: depositHash
})

const {
  writeContract: writeTokenDeposit,
  isPending: tokenDepositLoading,
  data: tokenDepositHash
} = useWriteContract()

const { isLoading: isConfirmingTokenDeposit } = useWaitForTransactionReceipt({
  hash: tokenDepositHash
})

const {
  writeContract: approve,
  isPending: isPendingApprove,
  data: approveHash
} = useWriteContract()

const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({
  hash: approveHash
})

watch(amount, () => {
  $v.value.$touch()
})

const { data: nativeBalance, isLoading: isLoadingNativeBalance } = useBalance({
  address: userDataStore.address as Address,
  chainId
})

const { data: usdcBalance, isLoading: isLoadingUsdcBalance } = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [userDataStore.address as Address]
})

const tokenList = [
  { name: NETWORK.currencySymbol, symbol: 'ETH' },
  { name: 'USDC', symbol: 'USDC' }
]

const emits = defineEmits(['deposit', 'closeModal'])

const target = ref<HTMLElement | null>(null)
onMounted(() => {
  onClickOutside(target, () => {
    isDropdownOpen.value = false
  })
  // Fetch the current price when component mounts
  currencyStore.fetchNativeTokenPrice()
})

const formattedBalance = computed(() => {
  if (selectedTokenId.value === 0) {
    return nativeBalance.value ? Number(formatEther(nativeBalance.value.value)).toFixed(4) : '0.00'
  }
  return usdcBalance.value ? (Number(usdcBalance.value) / 1e6).toFixed(4) : '0.00'
})

const isLoadingBalance = computed(() => isLoadingNativeBalance.value || isLoadingUsdcBalance.value)

const useMaxBalance = () => {
  amount.value = formattedBalance.value
}

const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const notExceedingBalance = helpers.withMessage('Amount exceeds your balance', (value: string) => {
  if (!value || parseFloat(value) <= 0) return true
  return parseFloat(value) <= parseFloat(formattedBalance.value)
})

const validDecimals = helpers.withMessage(
  'Amount must have at most 4 decimal places',
  (value: string) => {
    if (!value) return true
    const parts = value.split('.')
    return parts.length === 1 || parts[1].length <= 4
  }
)

const rules = {
  amount: {
    required,
    numeric,
    notZero,
    notExceedingBalance,
    validDecimals
  }
}

const $v = useVuelidate(rules, { amount })

const estimatedPrice = computed(() => {
  const amountValue = parseFloat(amount.value)
  if (isNaN(amountValue) || amountValue <= 0) return 0

  if (selectedTokenId.value === 0) {
    return Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.currency.code,
      minimumFractionDigits: 2
    }).format((currencyStore.nativeTokenPrice || 0) * amountValue)
  }

  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyStore.currency.code,
    minimumFractionDigits: 2
  }).format((usdcPrice.value || 0) * amountValue)
})

// Add currentStep ref
const currentStep = ref(1)

watch(
  [
    () => tokenList[selectedTokenId.value].symbol,
    isPendingApprove,
    isConfirmingApprove,
    tokenDepositLoading,
    isConfirmingTokenDeposit
  ],
  ([
    symbol,
    isPendingApprove,
    isConfirmingApprove,
    tokenDepositLoading,
    isConfirmingTokenDeposit
  ]) => {
    // Reset step when switching tokens
    if (symbol !== 'USDC') {
      currentStep.value = 1
      return
    }

    // Update steps for USDC
    if (isPendingApprove || isConfirmingApprove) {
      currentStep.value = 2
    } else if (tokenDepositLoading || isConfirmingTokenDeposit) {
      currentStep.value = 3
    } else {
      currentStep.value = 1
    }
  }
)

watch(isConfirmingDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('ETH deposited successfully')
    emits('closeModal')
  }
})

watch(isConfirmingTokenDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('USDC deposited successfully')
    emits('closeModal')
    depositAmount.value = '' // Clear stored amount
  }
})

watch(isConfirmingApprove, async (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Token approved successfully')
    if (depositAmount.value) {
      await handleUsdcDeposit(depositAmount.value)
    }
  }
})

const submitForm = async () => {
  await $v.value.$touch()
  if ($v.value.$invalid) return

  try {
    if (tokenList[selectedTokenId.value].symbol === 'ETH') {
      sendTransaction({
        to: props.bankAddress,
        value: parseEther(amount.value)
      })
    } else if (tokenList[selectedTokenId.value].symbol === 'USDC') {
      const tokenAmount = BigInt(Number(amount.value) * 1e6)
      depositAmount.value = amount.value // Store amount for after approval

      const allowance = await readContract(config, {
        address: USDC_ADDRESS as Address,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [userDataStore.address as Address, props.bankAddress]
      })

      const currentAllowance = allowance ? allowance.toString() : 0n
      if (Number(currentAllowance) < Number(tokenAmount)) {
        approve({
          address: USDC_ADDRESS as Address,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [props.bankAddress, tokenAmount]
        })
      } else {
        // If already approved, deposit directly
        await handleUsdcDeposit(amount.value)
      }
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to deposit ${tokenList[selectedTokenId.value].symbol}`)
  }
}

const handleUsdcDeposit = async (amount: string) => {
  const tokenAmount = BigInt(Number(amount) * 1e6)

  writeTokenDeposit({
    address: props.bankAddress,
    abi: BankABI,
    functionName: 'depositToken',
    args: [USDC_ADDRESS as Address, tokenAmount]
  })
}

const isLoading = computed(() => {
  return Boolean(
    props.loading ||
      depositLoading.value ||
      isConfirmingDeposit.value ||
      isPendingApprove.value ||
      isConfirmingApprove.value ||
      tokenDepositLoading.value ||
      isConfirmingTokenDeposit.value
  )
})

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
</script>
