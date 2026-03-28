<!-- filepath: app/src/components/sections/SafeView/SafeBalanceSection.vue -->
<template>
  <UCard :ui="{ root: 'shadow-md' }">
    <template #header>
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <h3 class="text-lg font-semibold">Balance</h3>
        </div>
        <div class="flex items-center gap-2"></div>
      </div>
    </template>

    <div class="flex justify-between items-start">
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block min-w-16 h-10">
              <span
                v-if="isLoading"
                class="loading loading-spinner loading-lg"
                data-test="safe-balance-loading"
              ></span>
              <span v-else>{{ total['USD']?.formated ?? 0 }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">
          ≈ {{ total[currency.code]?.formated ?? total['USD']?.formated ?? 0 }} {{ currency.code }}
        </div>
        <div class="text-sm text-gray-600 mt-2 flex flex-col gap-1">
          <div>
            <span class="font-medium">{{ safeInfo?.threshold ?? '-' }}</span> of
            <span class="font-medium">{{ safeInfo?.owners.length || 0 }}</span> signatures required
          </div>
          <div class="text-xs text-gray-500">Safe Balance</div>
        </div>
      </div>

      <div class="flex flex-col items-end gap-4">
        <div class="flex gap-2">
          <UButton
            color="secondary"
            data-test="deposit-button"
            leading-icon="heroicons-outline:plus"
            label="Deposit"
            @click="openDepositModal"
          />

          <UButton
            color="secondary"
            data-test="transfer-button"
            leading-icon="heroicons-outline:arrows-right-left"
            label="Transfer"
            @click="openTransferModal"
          />

          <UButton
            v-if="address"
            color="primary"
            data-test="open-safe-app-button"
            leading-icon="heroicons-outline:external-link"
            label="Open in Safe App"
            @click="openInSafeApp"
          />
        </div>
        <div class="flex items-center gap-2" v-if="address">
          <div class="text-sm text-gray-600">Safe Address:</div>
          <AddressToolTip :address="address" />
        </div>
      </div>
    </div>

    <!-- Deposit Modal -->
    <UModal
      v-if="depositModal.mount"
      v-model:open="depositModal.show"
      @update:open="handleDepositModalOpen"
      data-test="deposit-modal"
      title="Deposit to Safe Contract"
      description="Deposit assets to the Safe contract to fund your team’s operations."
      :close="{ onClick: () => closeDepositModal() }"
    >
      <template #body>
        <DepositSafeForm v-if="address" :safe-address="address" @close-modal="closeDepositModal" />
      </template>
    </UModal>

    <!-- Transfer Modal -->

    <UModal
      v-if="transferModal.mount"
      v-model:open="transferModal.show"
      @update:open="handleTransferModalOpen"
      data-test="transfer-modal"
      :close="{ onClick: () => resetTransferValues() }"
    >
      <template #body>
        <TransferForm
          v-model="transferData"
          :tokens="tokens"
          :loading="isTransferring"
          @transfer="handleTransfer"
          @closeModal="resetTransferValues"
        >
          <template #header>
            <h1 class="font-bold text-2xl">Transfer from Safe Contract</h1>
            <h3 class="pt-4">
              Current contract balance: {{ transferData.token.balance }}
              {{ transferData.token.symbol }}
            </h3>
          </template>
        </TransferForm>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import { useStorage } from '@vueuse/core'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { getSafeHomeUrl, openSafeAppUrl } from '@/composables/safe'

import { useContractBalance } from '@/composables/useContractBalance'
import { useGetSafeInfoQuery } from '@/queries/safe.queries'
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import type { TokenOption } from '@/types'
import { useSafeTransfer } from '@/composables/safe'
import { useQueryClient } from '@tanstack/vue-query'
import DepositSafeForm from '@/components/forms/DepositSafeForm.vue'
import { getTokenAddress } from '@/utils'

const chainId = useChainId()
const queryClient = useQueryClient()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

interface Props {
  address: Address
}

const props = defineProps<Props>()

const { total, balances, isLoading } = useContractBalance(props.address)

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

// Add refs for modals and form data
const depositModal = ref({
  mount: false,
  show: false
})

const transferModal = ref({
  mount: false,
  show: false
})

const { transferFromSafe, isTransferring } = useSafeTransfer()

const { data: safeInfo } = useGetSafeInfoQuery({ pathParams: { safeAddress: props.address } })

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

const openInSafeApp = () => {
  const safeAppUrl = getSafeHomeUrl(chainId.value, props.address)
  openSafeAppUrl(safeAppUrl)
}

const openDepositModal = () => {
  depositModal.value = { mount: true, show: true }
}

const openTransferModal = () => {
  transferModal.value = { mount: true, show: true }
}

const transferData: Ref<TransferModel> = ref(initialTransferDataValue())

const resetTransferValues = () => {
  transferModal.value = { mount: false, show: false }
  transferData.value = initialTransferDataValue()
}

const invalidateSafeBalances = async (safeAddress: Address) => {
  await queryClient.invalidateQueries({
    queryKey: ['balance', { address: safeAddress, chainId: chainId.value }]
  })

  const tokenAddresses = tokens.value
    .map((token) => getTokenAddress(token.tokenId))
    .filter((address): address is string => !!address)

  await Promise.all(
    tokenAddresses.map((tokenAddress) =>
      queryClient.invalidateQueries({
        queryKey: [
          'readContract',
          { address: tokenAddress as Address, args: [safeAddress], chainId: chainId.value }
        ]
      })
    )
  )
}

const handleTransfer = async (transferData: TransferModel) => {
  const safeAddress = props.address
  if (!safeAddress) return
  const options = {
    to: transferData.address.address,
    amount: transferData.amount,
    tokenId: transferData.token.tokenId
  }

  const result = await transferFromSafe(safeAddress, options)

  if (result) {
    resetTransferValues()
    await invalidateSafeBalances(safeAddress as Address)
    await queryClient.invalidateQueries({
      queryKey: ['safe', 'info', { safeAddress }]
    })
  }
}

const closeDepositModal = () => {
  depositModal.value = { mount: false, show: false }
}

const handleDepositModalOpen = (open: boolean) => {
  if (!open) {
    closeDepositModal()
  }
}

const handleTransferModalOpen = (open: boolean) => {
  if (!open) {
    resetTransferValues()
  }
}
</script>
