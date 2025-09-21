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
            v-if="bankAddress"
            :class="{ tooltip: !isBankOwner }"
            :data-tip="!isBankOwner ? 'Only the bank owner can transfer funds' : null"
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
        :tokens="tokens"
        :loading="
          transferLoading || isConfirmingTransfer || isLoadingAddAction || isConfirmingAddAction
        "
        @transfer="handleTransfer"
        @closeModal="() => (transferModal = false)"
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
import { type Address, parseEther, encodeFunctionData, parseUnits, type Abi } from 'viem'
import { useToastStore } from '@/stores'
import { useUserDataStore } from '@/stores'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import BankABI from '@/artifacts/abi/bank.json'
import { useContractBalance } from '@/composables/useContractBalance'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useBodContract } from '@/composables/bod/'
import type { TokenOption } from '@/types'

const props = defineProps<{
  bankAddress: Address
}>()

// Add refs for modals and form data
const depositModal = ref(false)
const transferModal = ref(false)

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

const { isBodAction } = useBodIsBodAction(props.bankAddress as Address, BankABI as Abi)

const userStore = useUserDataStore()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

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
// Contract interactions for transfer
const {
  data: transferHash,
  isPending: transferLoading,
  writeContract: transfer
} = useWriteContract()

const getTokens = (): TokenOption[] =>
  balances.value
    .map((b) => ({
      symbol: b.token.symbol,
      balance: b.amount,
      tokenId: b.token.id,
      price: b.values['USD'].price || 0,
      name: b.token.name,
      code: b.token.code
    }))
    .filter((b) => b.tokenId !== 'sher')

const tokens = computed(() => getTokens())

const transferData: Ref<TransferModel> = ref({
  address: { name: '', address: '' },
  token: tokens.value[0] ?? null,
  amount: '0'
})

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
</script>
