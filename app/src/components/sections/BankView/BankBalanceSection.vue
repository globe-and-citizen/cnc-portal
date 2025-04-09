<!-- BankBalanceSection.vue -->
<template>
  <CardComponent title="Balance">
    <div class="flex justify-between items-start">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block min-w-16 h-10">
              <span class="loading loading-spinner loading-lg" v-if="isLoading"></span>
              <span v-else>{{ balances.totalValueUSD }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">
          ≈ {{ totalValueLocal }} {{ currencyStore.currency.code }}
        </div>
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
            <IconifyIcon icon="heroicons-outline:plus" class="w-5 h-5" />
            Deposit
          </ButtonUI>
          <ButtonUI
            v-if="bankAddress"
            variant="secondary"
            class="flex items-center gap-2"
            @click="transferModal = true"
            data-test="transfer-button"
          >
            <IconifyIcon icon="heroicons-outline:arrows-right-left" class="w-5 h-5" />
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
      <TransferForm
        v-if="transferModal"
        v-model="transferData"
        :tokens="[
          { symbol: NETWORK.currencySymbol, balance: balances.nativeToken.formatted || '0' },
          { symbol: 'USDC', balance: balances.usdc.formatted || '0' }
        ]"
        :loading="transferLoading || isConfirmingTransfer"
        service="Bank"
        @transfer="handleTransfer"
        @closeModal="() => (transferModal = false)"
      />
    </ModalComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import CardComponent from '@/components/CardComponent.vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { computed, ref, watch } from 'vue'
import type { Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useToastStore } from '@/stores/useToastStore'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TransferForm from '@/components/forms/TransferForm.vue'
import { useUserDataStore } from '@/stores/user'
import { useCurrencyStore } from '@/stores/currencyStore'
import BankABI from '@/artifacts/abi/bank.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { parseEther } from 'viem'
import { useCryptoPrice } from '@/composables/useCryptoPrice'
import { useContractBalance } from '@/composables/useContractBalance'
import { Icon as IconifyIcon } from '@iconify/vue'

const props = defineProps<{
  bankAddress: Address | undefined
}>()

const emit = defineEmits<{
  (e: 'error'): void
  (e: 'balance-updated'): void
}>()

const { addErrorToast, addSuccessToast } = useToastStore()
const userDataStore = useUserDataStore()
const currencyStore = useCurrencyStore()
const { price: usdcPrice } = useCryptoPrice('usd-coin')
const currentAddress = userDataStore.address

// Use the contract balance composable
const { balances, isLoading, error, refetch } = useContractBalance(props.bankAddress)

// Add refs for modals and form data
const depositModal = ref(false)
const transferModal = ref(false)
const depositAmount = ref('')
const transferData = ref({
  address: { name: '', address: '' },
  token: { symbol: NETWORK.currencySymbol, balance: '0' },
  amount: '0'
})

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

const handleTransfer = async (data: {
  address: { address: string }
  token: { symbol: string }
  amount: string
}) => {
  if (!props.bankAddress) return

  try {
    if (data.token.symbol === NETWORK.currencySymbol) {
      transfer({
        address: props.bankAddress,
        abi: BankABI,
        functionName: 'transfer',
        args: [data.address.address, parseEther(data.amount)]
      })
    } else if (data.token.symbol === 'USDC') {
      const tokenAmount = BigInt(Number(data.amount) * 1e6)
      transfer({
        address: props.bankAddress,
        abi: BankABI,
        functionName: 'transferToken',
        args: [USDC_ADDRESS as Address, data.address.address, tokenAmount]
      })
    }
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to transfer ${data.token.symbol}`)
  }
}

// Computed properties
const loadingText = computed(() => {
  if (isPendingApprove.value) return 'Approving USDC...'
  if (isConfirmingApprove.value) return 'Confirming USDC approval...'
  if (tokenDepositLoading.value) return 'Depositing USDC...'
  if (isConfirmingTokenDeposit.value) return 'Confirming USDC deposit...'
  if (depositLoading.value) return 'Depositing ETH...'
  if (isConfirmingDeposit.value) return 'Confirming ETH deposit...'
  return 'Processing...'
})

const totalValueLocal = computed(() => {
  const usdValue = Number(balances.totalValueUSD)
  return (usdValue * (usdcPrice.value || 0)).toFixed(2)
})

// Watch handlers
watch([() => balances.nativeToken.formatted, () => balances.usdc.formatted], () => {
  emit('balance-updated')
})

watch(isConfirmingDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('ETH deposited successfully')
    depositModal.value = false
    refetch()
  }
})

watch(isConfirmingTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Transferred successfully')
    transferModal.value = false
    refetch()
  }
})

watch(isConfirmingTokenDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('USDC deposited successfully')
    depositModal.value = false
    refetch()
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
  balances,
  error,
  refetch
})
</script>
