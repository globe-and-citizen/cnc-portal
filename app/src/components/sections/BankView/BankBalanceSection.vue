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

          <div
            class="tooltip tooltip-top"
            :data-tip="
              !isBankOwner && !isBodAction ? 'Only the bank owner can transfer funds' : undefined
            "
            v-if="bankAddress"
          >

            <ButtonUI
              variant="secondary"
              class="flex items-center gap-2"
              @click="transferModal = true"
              :disabled="!isBankOwner && !isBodAction"
              data-test="transfer-button"
            >
              <IconifyIcon icon="heroicons-outline:arrows-right-left" class="w-5 h-5" />
              Transfer
            </ButtonUI>
            <span
              v-if="!isBankOwner"
              class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-sm bg-green-900 text-white rounded opacity-0 group-hover:opacity-100 transition"
              style="white-space: nowrap"
            >
              Only the bank owner can transfer funds
            </span>
          </div>
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
        :bank-address="bankAddress"
      />
    </ModalComponent>

    <!-- Transfer Modal -->
    <ModalComponent v-model="transferModal" data-test="transfer-modal">
      <TransferForm
        v-if="transferModal"
        v-model="transferData"
        :tokens="getTokens()"
        :loading="
          transferLoading || isConfirmingTransfer || isLoadingAddAction || isConfirmingAddAction
        "
        service="Bank"
        @transfer="handleTransfer"
        @closeModal="() => (transferModal = false)"
        :is-bod-action="isBodAction"
      />
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
import { ref, watch, computed } from 'vue'
import { type Address, parseEther, encodeFunctionData, parseUnits, type Abi } from 'viem'
import { useToastStore } from '@/stores'
import { useUserDataStore } from '@/stores'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TransferForm from '@/components/forms/TransferForm.vue'
import BankABI from '@/artifacts/abi/bank.json'
import { useContractBalance } from '@/composables/useContractBalance'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { TokenId } from '@/constant'
import { useQueryClient } from '@tanstack/vue-query'
import { useBodContract } from '@/composables/bod/'

const props = defineProps<{
  bankAddress: Address
}>()

const { addErrorToast, addSuccessToast } = useToastStore()

const {
  addAction,
  useBodIsBodAction,
  isLoading: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded
} = useBodContract()

const { isBodAction } = useBodIsBodAction(props.bankAddress as Address, BankABI as Abi)

const userStore = useUserDataStore()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})
const queryClient = useQueryClient()
const chainId = useChainId()

// get the current owner of the bank
const { data: bankOwner } = useReadContract({
  address: props.bankAddress,
  abi: BankABI,
  functionName: 'owner'
})

// check if the current user is the bank owner
const isBankOwner = computed(() => bankOwner.value === userStore.address)

// Use the contract balance composable
const { total, balances, isLoading } = useContractBalance(props.bankAddress)

// Add refs for modals and form data
const depositModal = ref(false)
const transferModal = ref(false)
const transferData = ref({
  address: { name: '', address: '' },
  token: { symbol: NETWORK.currencySymbol, balance: 0, tokenId: 'native' as TokenId },
  amount: '0'
})

// Contract interactions for transfer
const {
  data: transferHash,
  isPending: transferLoading,
  writeContract: transfer
} = useWriteContract()

const { isLoading: isConfirmingTransfer } = useWaitForTransactionReceipt({
  hash: transferHash
})

const handleTransfer = async (data: {
  address: { address: string }
  token: { symbol: string }
  amount: string
}) => {
  if (!props.bankAddress) return
  try {
    const isNativeToken = data.token.symbol === NETWORK.currencySymbol
    const transferAmount = isNativeToken ? parseEther(data.amount) : parseUnits(data.amount, 6)

    const transferConfig = {
      address: props.bankAddress,
      abi: BankABI,
      functionName: isNativeToken ? 'transfer' : 'transferToken',
      args: isNativeToken
        ? [data.address.address, transferAmount]
        : [USDC_ADDRESS as Address, data.address.address, transferAmount]
    }

    if (isBodAction.value) {
      const encodedData = encodeFunctionData(transferConfig)

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
    transfer(transferConfig)

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
    transferModal.value = false
  }
})

watch(isConfirmingTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Transferred successfully')
    transferModal.value = false

    //refresh bank owner data after a successful transfer
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

// Watch for changes in the bank owner
watch(bankOwner, (newOwner, oldOwner) => {
  if (newOwner && oldOwner && newOwner !== oldOwner) {
    console.log('Bank owner changed from', oldOwner, 'to', newOwner)
    // If the current user has lost ownership rights, close the transfer modal
    if (oldOwner === userStore.address && newOwner !== userStore.address && transferModal.value) {
      transferModal.value = false
      addErrorToast('You are no longer the bank owner and cannot make transfers')
    }
  }
})

const getTokens = () =>
  balances.value
    .map((b) => ({ symbol: b.token.symbol, balance: b.amount, tokenId: b.token.id }))
    .filter((b) => b.tokenId !== 'sher')
</script>
