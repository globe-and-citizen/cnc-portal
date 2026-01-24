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
          ≈ {{ total['USD']?.formated ?? 0 }} {{ currency.code }}
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
      @reset="() => closeDepositModal()"
    >
      <DepositBankForm
        @close-modal="closeDepositModal"
        :bank-address="teamStore.currentTeam?.safeAddress || bankAddress"
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
        :loading="false"
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
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useContractBalance } from '@/composables/useContractBalance'
import { useSafeInfoQuery } from '@/queries/safe.queries'
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import type { TokenOption } from '@/types'

const chainId = useChainId()
const queryClient = useQueryClient()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const props = defineProps<{
  bankAddress?: Address
}>()

const teamStore = useTeamStore()

const safeAddress = computed(() => teamStore.currentTeam?.safeAddress || props.bankAddress)

const { total, balances, isLoading } = useContractBalance(
  computed(() => safeAddress.value || ('0x' as Address))
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

// New Safe data composable with built-in query reactivity
const { data: safeInfo } = useSafeInfoQuery(
  computed(() => teamStore.currentTeamMeta?.data?.safeAddress)
)

// const displayUsdBalance = computed(
//   () => safeInfo.value?.totals?.['USD']?.formated ?? safeInfo.value?.balance ?? 0
// )

// Note: safeInfo.totals is optional (see SafeInfo type). We use optional chaining and fall back
// to the generic balance when the local currency or USD totals are not available.
// const displayLocalBalance = computed(() => {
//   const local = safeInfo.value?.totals?.[currency.value.code]?.formated
//   if (local) return local
//   const usd = safeInfo.value?.totals?.['USD']?.formated
//   if (usd) return usd
//   return safeInfo.value?.balance ?? 0
// })

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

const closeDepositModal = async () => {
  depositModal.value = { mount: false, show: false }

  // Wait for blockchain confirmation
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Invalidate Safe queries and balance queries to refresh automatically
  if (teamStore.currentTeam?.safeAddress) {
    // Invalidate native balance queries (for ETH/POL)
    await queryClient.invalidateQueries({
      queryKey: ['safe', 'info', { safeAddress: teamStore.currentTeam.safeAddress }]
    })
  }
}

const openTransferModal = () => {
  transferModal.value = { mount: true, show: true }
}

const transferData: Ref<TransferModel> = ref(initialTransferDataValue())

const resetTransferValues = () => {
  transferModal.value = { mount: false, show: false }
  transferData.value = initialTransferDataValue()
}

// Transfer logic intentionally removed (display-only)
</script>
