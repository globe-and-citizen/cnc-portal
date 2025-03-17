<!-- BankBalanceSection.vue -->
<template>
  <CardComponent title="Balance">
    <div class="flex justify-between items-start">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block min-w-16 h-10">
              <span
                class="loading loading-spinner loading-lg"
                v-if="balanceLoading || isLoadingUsdcBalance"
              ></span>
              <span v-else>{{ totalValueUSD }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">≈ {{ totalValueLocal }} CAD</div>
      </div>
      <div class="flex flex-col items-end gap-4">
        <div class="flex gap-2">
          <ButtonUI
            v-if="bankAddress"
            variant="secondary"
            class="flex items-center gap-2"
            @click="depositModal = true"
            data-test="deposit-button"
          >
            <PlusIcon class="w-5 h-5" />
            Deposit
          </ButtonUI>
          <ButtonUI
            v-if="bankAddress"
            variant="secondary"
            class="flex items-center gap-2"
            @click="transferModal = true"
            data-test="transfer-button"
          >
            <ArrowsRightLeftIcon class="w-5 h-5" />
            Transfer
          </ButtonUI>
        </div>
        <div class="flex items-center gap-2" v-if="bankAddress">
          <div class="text-sm text-gray-600">Contract Address:</div>
          <AddressToolTip :address="bankAddress" />
        </div>
      </div>
    </div>

    <!-- Deposit Modal -->
    <ModalComponent v-model="depositModal" data-test="deposit-modal">
      <DepositBankForm
        v-if="depositModal"
        @close-modal="() => (depositModal = false)"
        @deposit="depositToBank"
        :loading="
          depositLoading ||
          isConfirmingDeposit ||
          isPendingApprove ||
          isConfirmingApprove ||
          tokenDepositLoading ||
          isConfirmingTokenDeposit
        "
        :loading-text="loadingText"
      />
    </ModalComponent>

    <!-- Transfer Modal -->
    <ModalComponent v-model="transferModal" data-test="transfer-modal">
      <TransferFromBankForm
        v-if="transferModal"
        @close-modal="() => (transferModal = false)"
        @transfer="transferFromBank"
        @searchMembers="(input: string) => searchUsers({ name: '', address: input })"
        :filteredMembers="foundUsers"
        :loading="transferLoading || isConfirmingTransfer"
        :bank-balance="teamBalance?.formatted || '0'"
        :usdc-balance="formattedUsdcBalance || '0'"
        service="Bank"
      />
    </ModalComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { PlusIcon, ArrowsRightLeftIcon } from '@heroicons/vue/24/outline'
import ButtonUI from '@/components/ButtonUI.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import CardComponent from '@/components/CardComponent.vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import {
  useBalance,
  useReadContract,
  useChainId,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract
} from '@wagmi/vue'
import { computed, ref, watch } from 'vue'
import type { Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useToastStore } from '@/stores/useToastStore'
import { log, parseError } from '@/utils'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useUserDataStore } from '@/stores/user'
import BankABI from '@/artifacts/abi/bank.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { parseEther } from 'viem'
import type { User } from '@/types'

const props = defineProps<{
  bankAddress: Address | undefined
  priceData: {
    networkCurrencyPrice: number
    usdcPrice: number
    loading: boolean
    error: boolean | null
  }
}>()

const emit = defineEmits<{
  (e: 'error'): void
  (e: 'balance-updated'): void
}>()

const { addErrorToast, addSuccessToast } = useToastStore()
const userDataStore = useUserDataStore()
const currentAddress = userDataStore.address
const chainId = useChainId()

// Add refs for modals and form data
const depositModal = ref(false)
const transferModal = ref(false)
const foundUsers = ref<User[]>([])
const depositAmount = ref('')

// Contract interactions
const { sendTransaction, isPending: depositLoading, data: depositHash } = useSendTransaction()

const { isLoading: isConfirmingDeposit } = useWaitForTransactionReceipt({
  hash: depositHash
})

const {
  data: transferHash,
  isPending: transferLoading,
  writeContract: transfer
} = useWriteContract()

const { isLoading: isConfirmingTransfer } = useWaitForTransactionReceipt({
  hash: transferHash
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

// Balance fetching
const {
  data: teamBalance,
  isLoading: balanceLoading,
  error: balanceError,
  refetch: fetchBalance
} = useBalance({
  address: props.bankAddress,
  chainId
})

// USDC Balance
const {
  data: usdcBalance,
  isLoading: isLoadingUsdcBalance,
  refetch: fetchUsdcBalance,
  error: usdcBalanceError
} = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [props.bankAddress as Address]
})

const USD_TO_LOCAL_RATE = 1.28 // Example conversion rate to local currency

// Functions
const depositToBank = async (data: { amount: string; token: string }) => {
  if (!props.bankAddress) return

  try {
    if (data.token === 'ETH') {
      sendTransaction({
        to: props.bankAddress,
        value: parseEther(data.amount)
      })
    } else if (data.token === 'USDC') {
      const amount = BigInt(Number(data.amount) * 1e6)
      depositAmount.value = data.amount // Store amount for after approval

      const allowance = await readContract(config, {
        address: USDC_ADDRESS as Address,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [currentAddress as Address, props.bankAddress]
      })

      const currentAllowance = allowance ? allowance.toString() : 0n
      if (Number(currentAllowance) < Number(amount)) {
        approve({
          address: USDC_ADDRESS as Address,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [props.bankAddress, amount]
        })
      } else {
        // If already approved, deposit directly
        await handleUsdcDeposit(data.amount)
      }
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to deposit ${data.token}`)
  }
}

const handleUsdcDeposit = async (amount: string) => {
  if (!props.bankAddress) return
  const tokenAmount = BigInt(Number(amount) * 1e6)

  writeTokenDeposit({
    address: props.bankAddress,
    abi: BankABI,
    functionName: 'depositToken',
    args: [USDC_ADDRESS as Address, tokenAmount]
  })
}

const transferFromBank = async (to: string, amount: string, description: string, token: string) => {
  if (!props.bankAddress) return

  try {
    if (token === NETWORK.currencySymbol) {
      transfer({
        address: props.bankAddress,
        abi: BankABI,
        functionName: 'transfer',
        args: [to, parseEther(amount)]
      })
    } else if (token === 'USDC') {
      const tokenAmount = BigInt(Number(amount) * 1e6)
      transfer({
        address: props.bankAddress,
        abi: BankABI,
        functionName: 'transferToken',
        args: [USDC_ADDRESS as Address, to, tokenAmount]
      })
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to transfer ${token}`)
  }
}

const searchUsers = async (input: { name: string; address: string }) => {
  try {
    if (input.address) {
      const { data } = await useCustomFetch(`user/search?address=${input.address}`)
        .get()
        .json<{ users: User[] }>()
      foundUsers.value = data.value?.users || []
    }
  } catch (error) {
    console.error(error)
    addErrorToast('Failed to search users')
  }
}

// Computed properties
const formattedUsdcBalance = computed(() =>
  usdcBalance.value ? (Number(usdcBalance.value) / 1e6).toString() : '0'
)

const loadingText = computed(() => {
  if (isPendingApprove.value) return 'Approving USDC...'
  if (isConfirmingApprove.value) return 'Confirming USDC approval...'
  if (tokenDepositLoading.value) return 'Depositing USDC...'
  if (isConfirmingTokenDeposit.value) return 'Confirming USDC deposit...'
  if (depositLoading.value) return 'Depositing ETH...'
  if (isConfirmingDeposit.value) return 'Confirming ETH deposit...'
  return 'Processing...'
})

const totalValueUSD = computed(() => {
  const ethValue = teamBalance.value
    ? Number(teamBalance.value.formatted) * props.priceData.networkCurrencyPrice
    : 0
  const usdcValue = Number(formattedUsdcBalance.value) * props.priceData.usdcPrice
  return (ethValue + usdcValue).toFixed(2)
})

const totalValueLocal = computed(() => {
  return (Number(totalValueUSD.value) * USD_TO_LOCAL_RATE).toFixed(2)
})

// Watch handlers
watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to fetch team balance')
    log.error('Failed to fetch team balance:', parseError(balanceError.value))
    emit('error')
  }
})

watch([teamBalance, usdcBalance], () => {
  emit('balance-updated')
})

watch(
  () => props.bankAddress,
  async (newAddress) => {
    if (newAddress) {
      await Promise.all([fetchBalance(), fetchUsdcBalance()])
    }
  }
)

watch(isConfirmingDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('ETH deposited successfully')
    depositModal.value = false
    fetchBalance()
  }
})

watch(isConfirmingTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Transferred successfully')
    transferModal.value = false
    Promise.all([fetchBalance(), fetchUsdcBalance()])
  }
})

watch(isConfirmingTokenDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('USDC deposited successfully')
    depositModal.value = false
    fetchUsdcBalance()
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

// Expose methods and data for parent component
defineExpose({
  teamBalance,
  formattedUsdcBalance,
  balanceError,
  usdcBalanceError,
  fetchBalance,
  fetchUsdcBalance
})
</script>
