<!-- TransferModal.vue -->
<template>
  <div>
    <!-- Transfer Button with Tooltip -->
    <UTooltip
      :text="
        archivedTooltip ??
        (!hasTheRight
          ? 'Only the bank owner can transfer funds'
          : !isBalanceGreaterThanZero
            ? 'Bank balance is 0'
            : undefined)
      "
    >
      <UButton
        color="secondary"
        leading-icon="heroicons-outline:arrows-right-left"
        label="Transfer"
        @click="openModal"
        :disabled="isWriteDisabled || !hasTheRight || !isBalanceGreaterThanZero"
        data-test="transfer-button"
      />
    </UTooltip>

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
        <TransferForm
          v-model="transferData"
          :tokens="tokens"
          :loading="isLoading"
          :fee-bps="feeBps"
          :error-message="errorMessage"
          @transfer="handleTransfer"
          @closeModal="resetTransferValues"
          :is-bod-action="isBodAction"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { type Address, encodeFunctionData, parseEther, parseUnits } from 'viem'
import { NETWORK, SUPPORTED_TOKENS, USDC_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import { type Ref, computed, ref, watch } from 'vue'
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import { contractBalanceKeys, useContractBalance } from '@/composables'
import { useChainId, useReadContract } from '@wagmi/vue'
import { useTransfer, useTransferToken } from '@/composables/bank/writes'
import type { TokenOption } from '@/types'
import { bankAbi } from '@/artifacts/abi/generated'
import { bankEventKeys } from '@/composables/bank/useBankEventsViaLogs'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'
import { useBankTransferFee } from '@/composables/bank/useBankTransferFee'
import { useBodAddAction } from '@/composables/bod/writes'
import { useBodIsBodAction } from '@/composables/bod/reads'
import { useQueryClient } from '@tanstack/vue-query'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useUserDataStore } from '@/stores'

interface Props {
  bankAddress: Address
}

const props = withDefaults(defineProps<Props>(), {})

const chainId = useChainId()
const queryClient = useQueryClient()
const toast = useToast()
const { archivedTooltip, isWriteDisabled } = useTeamWriteGuard()

const { data: balance } = useContractBalance(props.bankAddress)
const balances = computed(() => balance.value?.balances ?? [])

const userStore = useUserDataStore()

// get the current owner of the bank
const { data: bankOwner } = useReadContract({
  address: props.bankAddress,
  abi: bankAbi,
  functionName: 'owner'
})

const { isBodAction } = useBodIsBodAction(props.bankAddress as Address)

const isBankOwner = computed(() => bankOwner.value === userStore.address)

const {
  mutate: addAction,
  isPending: isLoadingAddAction,
  isSuccess: isActionAdded
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
  () => transferNative.isPending.value || transferToken.isPending.value || isLoadingAddAction.value
)

// Get available tokens for transfer
const getTokens = (): TokenOption[] =>
  balances.value
    .map((b) => ({
      symbol: b.token.symbol,
      balance: b.amount,
      tokenId: b.token.id,
      price: b.price.local.value,
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

const { feeBps, grossUpForTransferFee } = useBankTransferFee(
  () => SUPPORTED_TOKENS.find((token) => token.id === transferData.value.token.tokenId)?.address
)

// Reset transfer values
const resetTransferValues = () => {
  modal.value = { mount: false, show: false }
  transferData.value = initialTransferDataValue()
  errorMessage.value = ''
}

// Open modal
const openModal = () => {
  if (isWriteDisabled.value) return
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

  const userAmountBigInt = isNativeToken ? parseEther(data.amount) : parseUnits(data.amount, 6)
  const transferAmount = grossUpForTransferFee(userAmountBigInt)

  if (isBodAction.value) {
    // BOD Action path
    const encodedData = isNativeToken
      ? encodeFunctionData({
          abi: bankAbi,
          functionName: 'transfer',
          args: [data.address.address, transferAmount]
        })
      : encodeFunctionData({
          abi: bankAbi,
          functionName: 'transferToken',
          args: [tokenAddress as Address, data.address.address, transferAmount]
        })

    const description = JSON.stringify({
      text: `Transfer ${data.amount} ${data.token.symbol} to ${data.address.address}`,
      title: 'Bank Transfer Request'
    })

    addAction(
      {
        targetAddress: props.bankAddress,
        description,
        data: encodedData
      },
      {
        onError: (error) => {
          const classified = classifyError(error)
          errorMessage.value = classified.userMessage
        }
      }
    )
    return
  }

  const onSuccess = async () => {
    toast.add({ title: 'Transferred successfully', color: 'success' })

    // Native and ERC-20 amounts share one query per contract, so both transfer
    // paths refresh through the same key.
    await queryClient.invalidateQueries({
      queryKey: contractBalanceKeys.detail(props.bankAddress, chainId.value)
    })
    await queryClient.invalidateQueries({ queryKey: bankEventKeys.all })

    resetTransferValues()
  }

  const onError = (error: unknown) => {
    log.error('Transfer failed:', error)
    const classified = classifyError(error, { contract: 'Bank' })
    if (classified.category === 'user_rejected') return
    errorMessage.value = classified.userMessage
  }

  if (isNativeToken) {
    transferNative.mutate({ args: [data.address.address, transferAmount] }, { onSuccess, onError })
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
