<!-- BankBalanceSection.vue -->
<template>
  <CardComponent title="Balance">
    <div class="flex justify-between items-start">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block min-w-16 h-10">
              <span
                data-test="loading-spinner"
                class="loading loading-spinner loading-lg"
                v-if="isLoading"
              ></span>
              <span v-else>{{ total['USD']?.formated ?? 0 }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">
          ≈ {{ total[currency.code]?.formated ?? 0 }} {{ currency.code }}
        </div>
        <div class="text-sm text-red-500 mt-1 flex gap-2">
          <IconifyIcon icon="heroicons-outline:lock-closed" class="w-4 h-4" />
          {{ dividendsTotal['USD']?.formated ?? 0 }} USD
          <span class="text-xs">(dividends)</span>
        </div>
      </div>
      <div class="flex flex-col items-end gap-4">
        <div class="flex gap-2">
          <ButtonUI
            v-if="bankAddress"
            variant="secondary"
            class="flex items-center gap-2"
            @click="depositModal = { mount: true, show: true }"
            data-test="deposit-button"
          >
            <IconifyIcon icon="heroicons-outline:plus" class="w-5 h-5" />
            Deposit
          </ButtonUI>

          <div
            v-if="bankAddress"
            :class="{ tooltip: showOwnerTooltip || soldeBalance }"
            :data-tip="
              showOwnerTooltip
                ? 'Only the bank owner can transfer funds'
                : soldeBalance
                  ? 'Bank balance is 0'
                  : null
            "
          >
            <ButtonUI
              variant="secondary"
              class="flex items-center gap-2"
              @click="transferModal = { mount: true, show: true }"
              :disabled="(!isBankOwner && !isBodAction) || !hasPositiveBalance"
              data-test="transfer-button"
            >
              <IconifyIcon icon="heroicons-outline:arrows-right-left" class="w-5 h-5" />
              Transfer
            </ButtonUI>
          </div>
        </div>
        <div class="flex items-center gap-2" v-if="bankAddress">
          <div class="text-sm text-gray-600">Contract Address:</div>
          <AddressToolTip :address="bankAddress" />
        </div>
      </div>
    </div>

    <!-- Deposit Modal -->
    <ModalComponent
      v-model="depositModal.show"
      v-if="depositModal.mount"
      data-test="deposit-modal"
      @reset="() => (depositModal = { mount: false, show: false })"
    >
      <DepositBankForm
        @close-modal="() => (depositModal = { mount: false, show: false })"
        :bank-address="bankAddress"
      />
    </ModalComponent>

    <!-- Transfer Modal -->

    <ModalComponent
      v-model="transferModal.show"
      v-if="transferModal.mount"
      data-test="transfer-modal"
      @reset="resetTransferValues"
    >
      <TransferForm
        v-model="transferData"
        :tokens="tokens"
        :loading="
          transferLoading || isConfirmingTransfer || isLoadingAddAction || isConfirmingAddAction
        "
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
  </CardComponent>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import CardComponent from '@/components/CardComponent.vue'

import { NETWORK, USDC_ADDRESS } from '@/constant'
import { useStorage } from '@vueuse/core'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useReadContract
} from '@wagmi/vue'
import { ref, watch, computed, type Ref } from 'vue'
import { type Address, parseEther, encodeFunctionData, parseUnits } from 'viem'
import { useToastStore } from '@/stores'
import { useUserDataStore } from '@/stores'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useContractBalance } from '@/composables/useContractBalance'

import { Icon as IconifyIcon } from '@iconify/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useBodContract } from '@/composables/bod/'
import type { TokenOption } from '@/types'
import { waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/wagmi.config'

const props = defineProps<{
  bankAddress: Address
}>()

// Add refs for modals and form data

const chainId = useChainId()
const queryClient = useQueryClient()

const { addErrorToast, addSuccessToast } = useToastStore()

const {
  addAction,
  useBodIsBodAction,
  isLoading: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded
} = useBodContract()

const { isBodAction } = useBodIsBodAction(props.bankAddress as Address, BANK_ABI)

const userStore = useUserDataStore()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

// get the current owner of the bank
const { data: bankOwner } = useReadContract({
  address: props.bankAddress,
  abi: BANK_ABI,
  functionName: 'owner'
})

// check if the current user is the bank owner
const isBankOwner = computed(() => bankOwner.value === userStore.address)

// Use the contract balance composable
const { total, balances, dividendsTotal, isLoading } = useContractBalance(props.bankAddress)

const hasPositiveBalance = computed(() =>
  balances.value.some((b) => b.token.id !== 'sher' && b.amount > 0)
)
const showOwnerTooltip = computed(() => !isBankOwner.value && !isBodAction.value)
const soldeBalance = computed(
  () => (isBankOwner.value || isBodAction.value) && !hasPositiveBalance.value
)

// Add refs for modals and form data
const depositModal = ref({
  mount: false,
  show: false
})

const transferModal = ref({
  mount: false,
  show: false
})

// Contract interactions for transfer
const {
  data: transferHash,
  isPending: transferLoading,
  writeContractAsync: transfer
} = useWriteContract()

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

const resetTransferValues = () => {
  transferModal.value = { mount: false, show: false }
  transferData.value = initialTransferDataValue()
}

const { isLoading: isConfirmingTransfer } = useWaitForTransactionReceipt({
  hash: transferHash
})

const handleTransfer = async (data: {
  address: { address: Address }
  token: { symbol: string }
  amount: string
}) => {
  if (!props.bankAddress) return
  try {
    const isNativeToken = data.token.symbol === NETWORK.currencySymbol
    const transferAmount = isNativeToken ? parseEther(data.amount) : parseUnits(data.amount, 6)

    if (isBodAction.value) {
      const encodedData = isNativeToken
        ? encodeFunctionData({
            abi: BANK_ABI,
            functionName: 'transfer',
            args: [data.address.address, transferAmount]
          })
        : encodeFunctionData({
            abi: BANK_ABI,
            functionName: 'transferToken',
            args: [USDC_ADDRESS as Address, data.address.address, transferAmount]
          })

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
    } else {
      await transfer({
        address: props.bankAddress,
        abi: BANK_ABI,
        functionName: 'transferToken',
        args: [USDC_ADDRESS as Address, data.address.address, transferAmount]
      })
    }
    if (!transferHash.value) {
      throw new Error('There is no receipt for this transaction')
    }

    await waitForTransactionReceipt(config, { hash: transferHash.value })

    // Invalidate relevant queries
    const queryKey = isNativeToken
      ? ['balance', { address: props.bankAddress, chainId: chainId }]
      : [
          'readContract',
          {
            address: USDC_ADDRESS as Address,
            args: [props.bankAddress],
            chainId: chainId
          }
        ]

    queryClient.invalidateQueries({ queryKey })
  } catch (error) {
    console.error('Transfer failed:', error)
    addErrorToast(`Failed to transfer ${data.token.symbol}`)
  }
}

watch(isActionAdded, (added) => {
  if (added) {
    addSuccessToast('Action added successfully, waiting for confirmation')
    resetTransferValues()
  }
})

// watch(isConfirmingTransfer, (newIsConfirming, oldIsConfirming) => {
//   if (!newIsConfirming && oldIsConfirming) {
//     addSuccessToast('Transferred successfully')
//     resetTransferValues()

//     //refresh bank owner data after a successful transfer
//     queryClient.invalidateQueries({
//       queryKey: [
//         'readContract',
//         {
//           address: props.bankAddress,
//           functionName: 'owner'
//         }
//       ]
//     })
//   }
// })
</script>
