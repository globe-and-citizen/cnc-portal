<!-- TransferModal.vue -->
<template>
  <div>
    <!-- Transfer Button with Tooltip -->
    <div
      :class="{ tooltip: !hasTheRight || !isBalanceGreaterThanZero }"
      :data-tip="
        !hasTheRight
          ? 'Only the bank owner can transfer funds'
          : !isBalanceGreaterThanZero
            ? 'Bank balance is 0'
            : null
      "
    >
      <ButtonUI
        variant="secondary"
        class="flex items-center gap-2"
        @click="openModal"
        :disabled="!hasTheRight || !isBalanceGreaterThanZero"
        data-test="transfer-button"
      >
        <IconifyIcon icon="heroicons-outline:arrows-right-left" class="w-5 h-5" />
        Transfer
      </ButtonUI>
    </div>

    <!-- Transfer Modal -->
    <ModalComponent
      v-model="modal.show"
      v-if="modal.mount"
      data-test="transfer-modal"
      @reset="resetTransferValues"
    >
      <TransferForm
        v-model="transferData"
        :tokens="tokens"
        :loading="isLoading"
        @transfer="handleTransfer"
        @closeModal="resetTransferValues"
        :is-bod-action="isBodAction"
      >
        <template #header>
          <h1 class="font-bold text-2xl">Transfer from Bank Contract</h1>
          <h3 class="pt-4">
            Current contract balance: {{ transferData.token.balance }}
            {{ transferData.token.symbol }}
          </h3>
        </template>
      </TransferForm>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { ref, watch, computed, type Ref } from 'vue'
import { type Address, parseEther, encodeFunctionData, parseUnits } from 'viem'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useReadContract
} from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { NETWORK, USDC_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import { useToastStore, useUserDataStore } from '@/stores'
import { useBodContract } from '@/composables/bod/'
import type { TokenOption } from '@/types'
import { useContractBalance } from '@/composables'

interface Props {
  bankAddress: Address
}

const props = withDefaults(defineProps<Props>(), {})

const chainId = useChainId()
const queryClient = useQueryClient()
const { addErrorToast, addSuccessToast } = useToastStore()
const { useBodIsBodAction } = useBodContract()

const { balances } = useContractBalance(props.bankAddress)

const userStore = useUserDataStore()

// get the current owner of the bank
const { data: bankOwner } = useReadContract({
  address: props.bankAddress,
  abi: BANK_ABI,
  functionName: 'owner'
})

const { isBodAction } = useBodIsBodAction(props.bankAddress as Address, BANK_ABI)

const isBankOwner = computed(() => bankOwner.value === userStore.address)

const {
  addAction,
  isLoading: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded
} = useBodContract()

// Modal state
const modal = ref({
  mount: false,
  show: false
})

// Contract interactions for transfer
const {
  data: transferHash,
  isPending: transferLoading,
  writeContractAsync: transfer
} = useWriteContract()

const { isLoading: isConfirmingTransfer } = useWaitForTransactionReceipt({
  hash: transferHash
})

// Computed loading state
const isLoading = computed(
  () =>
    transferLoading.value ||
    isConfirmingTransfer.value ||
    isLoadingAddAction.value ||
    isConfirmingAddAction.value
)

// Get available tokens for transfer
const getTokens = (): TokenOption[] =>
  balances.value
    .map((b) => ({
      symbol: b.token.symbol,
      balance: b.amount,
      tokenId: b.token.id,
      price: b.values['USD']?.price ?? 0,
      name: b.token.name,
      code: b.token.code
    }))
    .filter((b) => b.tokenId !== 'sher')

const tokens = computed(() => getTokens())

const hasTheRight = computed(() => isBankOwner.value || isBodAction.value)

const isBalanceGreaterThanZero = computed(() =>
  balances.value.some((b) => b.token.id !== 'sher' && b.amount > 0)
)

// Initialize transfer data
const initialTransferDataValue = (): TransferModel => {
  const firstToken = tokens.value[0]
  return {
    address: { name: '', address: '' },
    token: firstToken ?? {
      symbol: '',
      balance: 0,
      tokenId: 'native',
      price: 0,
      name: '',
      code: ''
    },
    amount: '0'
  }
}

const transferData: Ref<TransferModel> = ref(initialTransferDataValue())

// Reset transfer values
const resetTransferValues = () => {
  modal.value = { mount: false, show: false }
  transferData.value = initialTransferDataValue()
}

// Open modal
const openModal = () => {
  modal.value = { mount: true, show: true }
}

// Handle transfer
const handleTransfer = async (data: {
  address: { address: Address }
  token: { symbol: string }
  amount: string
}) => {
  if (!props.bankAddress) return

  try {
    const isNativeToken = data.token.symbol === NETWORK.currencySymbol
    const isUsdce = data.token.symbol === 'USDCe'
    const isUsdc = data.token.symbol === 'USDC'
    const transferAmount = isNativeToken ? parseEther(data.amount) : parseUnits(data.amount, 6)

    if (isBodAction.value) {
      // BOD Action path
      const encodedData = isNativeToken
        ? encodeFunctionData({
            abi: BANK_ABI,
            functionName: 'transfer',
            args: [data.address.address, transferAmount]
          })
        : isUsdce
          ? encodeFunctionData({
              abi: BANK_ABI,
              functionName: 'transferToken',
              args: [USDC_E_ADDRESS as Address, data.address.address, transferAmount]
            })
          : isUsdc
            ? encodeFunctionData({
                abi: BANK_ABI,
                functionName: 'transferToken',
                args: [USDC_ADDRESS as Address, data.address.address, transferAmount]
              })
            : null

      const description = JSON.stringify({
        text: `Transfer ${data.amount} ${data.token.symbol} to ${data.address.address}`,
        title: 'Bank Transfer Request'
      })

      await addAction({
        targetAddress: props.bankAddress,
        description,
        data: encodedData
      })

      return
    }

    // Direct transfer (non-BOD action)
    if (isNativeToken) {
      await transfer({
        address: props.bankAddress,
        abi: BANK_ABI,
        functionName: 'transfer',
        args: [data.address.address, transferAmount]
      })
    }

    if (isUsdc) {
      await transfer({
        address: props.bankAddress,
        abi: BANK_ABI,
        functionName: 'transferToken',
        args: [USDC_ADDRESS as Address, data.address.address, transferAmount]
      })
    }

    if (isUsdce) {
      await transfer({
        address: props.bankAddress,
        abi: BANK_ABI,
        functionName: 'transferToken',
        args: [USDC_E_ADDRESS as Address, data.address.address, transferAmount]
      })
    }

    if (!transferHash.value) {
      throw new Error('There is no receipt for this transaction')
    }

    await waitForTransactionReceipt(config, { hash: transferHash.value })

    // Invalidate relevant queries
    const queryKey = isNativeToken
      ? ['balance', { address: props.bankAddress, chainId: chainId.value }]
      : [
          'readContract',
          {
            address: isUsdc
              ? (USDC_ADDRESS as Address)
              : isUsdce
                ? (USDC_E_ADDRESS as Address)
                : '',
            args: [props.bankAddress],
            chainId: chainId.value
          }
        ]

    queryClient.invalidateQueries({ queryKey })
  } catch (error) {
    console.error('Transfer failed:', error)
    addErrorToast(`Failed to transfer ${data.token.symbol}`)
  }
}

// Watch for BOD action completion
watch(isActionAdded, (added) => {
  if (added) {
    addSuccessToast('Action added successfully, waiting for confirmation')
    resetTransferValues()
  }
})

// Watch for transfer confirmation
watch(isConfirmingTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Transferred successfully')
    resetTransferValues()

    // Refresh bank owner data after a successful transfer
    queryClient.invalidateQueries({
      queryKey: [
        'readContract',
        {
          address: props.bankAddress,
          functionName: 'owner'
        }
      ]
    })
  }
})
</script>
