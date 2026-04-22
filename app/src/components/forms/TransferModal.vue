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
      <UButton
        color="secondary"
        leading-icon="heroicons-outline:arrows-right-left"
        label="Transfer"
        @click="openModal"
        :disabled="!hasTheRight || !isBalanceGreaterThanZero"
        data-test="transfer-button"
      />
    </div>

    <!-- Transfer Modal -->
    <UModal
      v-if="modal.mount"
      v-model:open="modal.show"
      data-test="transfer-modal"
      title="Transfer from Bank Contract"
      :description="`Current contract balance: ${transferData.token.balance} ${transferData.token.symbol}`"
      :close="{ onClick: resetTransferValues }"
    >
      <template #body>
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :description="errorMessage"
          class="mb-4"
        />
        <TransferForm
          v-model="transferData"
          :tokens="tokens"
          :loading="isLoading"
          :fee-bps="feeBpsNumber"
          @transfer="handleTransfer"
          @closeModal="resetTransferValues"
          :is-bod-action="isBodAction"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import { ref, watch, computed, type Ref } from 'vue'
import { type Address, parseEther, encodeFunctionData, parseUnits } from 'viem'
import { useChainId, useReadContract } from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { NETWORK, USDC_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import { useUserDataStore } from '@/stores'
import { useBodAddAction } from '@/composables/bod/writes'
import { useBodIsBodAction } from '@/composables/bod/reads'
import { useOfficerFeeBps } from '@/composables/officer/reads'
import { useTransfer, useTransferToken } from '@/composables/bank/writes'
import { classifyError, log } from '@/utils'
import type { TokenOption } from '@/types'
import { useContractBalance } from '@/composables'

interface Props {
  bankAddress: Address
}

const props = withDefaults(defineProps<Props>(), {})

const chainId = useChainId()
const queryClient = useQueryClient()
const toast = useToast()

const { balances } = useContractBalance(props.bankAddress)

const userStore = useUserDataStore()

// get the current owner of the bank
const { data: bankOwner } = useReadContract({
  address: props.bankAddress,
  abi: BANK_ABI,
  functionName: 'owner'
})

const { isBodAction } = useBodIsBodAction(props.bankAddress as Address)

const { data: feeBpsData } = useOfficerFeeBps('BANK')
const feeBpsNumber = computed(() => Number(feeBpsData.value ?? 0))

const isBankOwner = computed(() => bankOwner.value === userStore.address)

const {
  executeAddAction: addAction,
  isPending: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded
} = useBodAddAction()

// Modal state
const modal = ref({
  mount: false,
  show: false
})
const errorMessage = ref('')

// Contract interactions for transfer
const transferNative = useTransfer()
const transferToken = useTransferToken()

// Computed loading state
const isLoading = computed(
  () =>
    transferNative.isPending.value ||
    transferToken.isPending.value ||
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
  errorMessage.value = ''
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

  const tokenAddress = data.token.symbol === 'USDCe' ? USDC_E_ADDRESS : USDC_ADDRESS
  const isNativeToken = data.token.symbol === NETWORK.currencySymbol

  // Exact formula: the contract deducts fee from _amount and sends net to recipient.
  // To give recipient exactly `userAmountBigInt`, we must send: amount * 10000 / (10000 - feeBps)
  const userAmountBigInt = isNativeToken ? parseEther(data.amount) : parseUnits(data.amount, 6)
  const feeBps = BigInt(feeBpsNumber.value)
  const transferAmount =
    feeBps > 0n ? (userAmountBigInt * 10000n) / (10000n - feeBps) : userAmountBigInt

  if (isBodAction.value) {
    // BOD Action path
    const encodedData = isNativeToken
      ? encodeFunctionData({
          abi: BANK_ABI,
          functionName: 'transfer',
          args: [data.address.address, transferAmount]
        })
      : encodeFunctionData({
          abi: BANK_ABI,
          functionName: 'transferToken',
          args: [tokenAddress as Address, data.address.address, transferAmount]
        })

    const description = JSON.stringify({
      text: `Transfer ${data.amount} ${data.token.symbol} to ${data.address.address}`,
      title: 'Bank Transfer Request'
    })

    try {
      await addAction({
        targetAddress: props.bankAddress,
        description,
        data: encodedData
      })
    } catch (error) {
      log.error('Transfer (BOD action) failed:', error)
      errorMessage.value = `Failed to transfer ${data.token.symbol}`
    }
    return
  }

  const onSuccess = async () => {
    toast.add({ title: 'Transferred successfully', color: 'success' })

    const queryKey = isNativeToken
      ? ['balance', { address: props.bankAddress, chainId: chainId.value }]
      : [
          'readContract',
          {
            address: tokenAddress,
            args: [props.bankAddress],
            chainId: chainId.value
          }
        ]
    await queryClient.invalidateQueries({ queryKey })

    resetTransferValues()
  }

  const onError = (error: unknown) => {
    log.error('Transfer failed:', error)
    const classified = classifyError(error, { contract: 'Bank' })
    if (classified.category === 'user_rejected') return
    errorMessage.value = classified.userMessage
  }

  if (isNativeToken) {
    transferNative.mutate(
      { args: [data.address.address, transferAmount] },
      { onSuccess, onError }
    )
  } else {
    transferToken.mutate(
      { args: [tokenAddress, data.address.address, transferAmount] },
      { onSuccess, onError }
    )
  }
}

// Watch for BOD action completion
watch(isActionAdded, (added) => {
  if (added) {
    toast.add({ title: 'Action added successfully, waiting for confirmation', color: 'success' })
    resetTransferValues()
  }
})
</script>
