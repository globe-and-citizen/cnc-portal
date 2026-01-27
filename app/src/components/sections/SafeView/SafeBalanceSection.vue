<!-- filepath: app/src/components/sections/SafeView/SafeBalanceSection.vue -->
<template>
  <CardComponent title="Balance">
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
          <ButtonUI
            variant="secondary"
            class="flex items-center gap-2"
            data-test="deposit-button"
            @click="openDepositModal"
          >
            <IconifyIcon icon="heroicons-outline:plus" class="w-5 h-5" />
            Deposit
          </ButtonUI>

          <ButtonUI
            variant="secondary"
            class="flex items-center gap-2"
            data-test="transfer-button"
            @click="openTransferModal"
          >
            <IconifyIcon icon="heroicons-outline:arrows-right-left" class="w-5 h-5" />
            Transfer
          </ButtonUI>

          <ButtonUI
            v-if="teamStore.currentTeam?.safeAddress"
            variant="primary"
            class="flex items-center gap-2"
            @click="openInSafeApp"
            data-test="open-safe-app-button"
          >
            <IconifyIcon icon="heroicons-outline:external-link" class="w-5 h-5" />
            Open in Safe App
          </ButtonUI>
        </div>
        <div class="flex items-center gap-2" v-if="teamStore.currentTeam?.safeAddress">
          <div class="text-sm text-gray-600">Safe Address:</div>
          <AddressToolTip :address="teamStore.currentTeam?.safeAddress" />
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
      <DepositSafeForm
        v-if="teamStore.currentTeamMeta?.data?.safeAddress"
        :safe-address="teamStore.currentTeamMeta?.data?.safeAddress"
        @close-modal="closeDepositModal"
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
    </ModalComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import { useStorage } from '@vueuse/core'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { getSafeHomeUrl, openSafeAppUrl } from '@/composables/safe'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import ModalComponent from '@/components/ModalComponent.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useSafeInfoQuery } from '@/queries/safe.queries'
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import type { TokenOption } from '@/types'
import { useSafeTransfer } from '@/composables/safe'
import { useQueryClient } from '@tanstack/vue-query'
import DepositSafeForm from '@/components/forms/DepositSafeForm.vue'

const chainId = useChainId()
const queryClient = useQueryClient()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const teamStore = useTeamStore()

const { total, balances, isLoading } = useContractBalance(
  computed(() => teamStore.currentTeamMeta?.data?.safeAddress || ('0x' as Address))
)

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

// New Safe data composable with built-in query reactivity
const { data: safeInfo } = useSafeInfoQuery(
  computed(() => teamStore.currentTeamMeta?.data?.safeAddress)
)

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
  const safeAppUrl = getSafeHomeUrl(chainId.value, teamStore.currentTeam?.safeAddress as Address)
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

const handleTransfer = async (transferData: TransferModel) => {
  const safeAddress = teamStore.currentTeam?.safeAddress
  if (!safeAddress) return

  const options = {
    to: transferData.address.address,
    amount: transferData.amount,
    tokenAddress: transferData.token.tokenId === 'native' ? undefined : transferData.token.tokenId
  }

  const result = await transferFromSafe(safeAddress, options)

  if (result) {
    resetTransferValues()
    // Optionally invalidate queries to refresh balances
    await queryClient.invalidateQueries({
      queryKey: ['safe', 'info', { safeAddress }]
    })
  }
}

const closeDepositModal = async () => {
  depositModal.value = { mount: false, show: false }
}

// Transfer logic intentionally removed (display-only)
</script>
