<!-- filepath: app/src/components/sections/SafeView/SafeBalanceSection.vue -->
<template>
  <CardComponent title="Balance">
    <div class="flex justify-between items-start">
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block min-w-16 h-10">
              <span
                v-if="isBalanceLoading"
                class="loading loading-spinner loading-lg"
                data-test="safe-balance-loading"
              ></span>
              <span v-else>{{ total['USD']?.formated ?? 0 }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">
          ≈ {{ displayLocalBalance }} {{ currency.code }}
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
    <!-- <ModalComponent
      v-model="transferModal.show"
      v-if="transferModal.mount"
      data-test="transfer-modal"
      @reset="() => closeTransferModal()"
    >
      <DepositBankForm
        @close-modal="closeTransferModal"
        :bank-address="teamStore.currentTeam?.safeAddress || bankAddress"
      />
    </ModalComponent> -->
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import { useStorage } from '@vueuse/core'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useSafeData, getSafeHomeUrl, openSafeAppUrl } from '@/composables/safe'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { SAFE_QUERY_KEYS } from '@/queries/safe.queries'
import { useContractBalance } from '@/composables/useContractBalance'

const chainId = useChainId()
const queryClient = useQueryClient()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const props = defineProps<{
  bankAddress: Address
}>()

const teamStore = useTeamStore()

// Computed Safe address for reactivity
const safeAddress = computed(() => teamStore.currentTeam?.safeAddress || props.bankAddress)

// Use the contract balance composable for Safe address
const { total, isLoading } = useContractBalance(safeAddress as unknown as Address)

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
const {
  safeInfo,
  isLoading: isSafeLoading,
  error,
  refetch
} = useSafeData(computed(() => teamStore.currentTeam?.safeAddress))

const displayLocalBalance = computed(() => total.value[currency.value.code]?.formated ?? 0)

const isBalanceLoading = computed(() => isSafeLoading.value || isLoading.value)

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
    // Invalidate Safe info queries
    await queryClient.invalidateQueries({
      queryKey: SAFE_QUERY_KEYS.info(chainId.value, teamStore.currentTeam.safeAddress)
    })
    // Invalidate native balance queries (for ETH/POL)
    await queryClient.invalidateQueries({
      queryKey: ['balance', { address: teamStore.currentTeam.safeAddress, chainId: chainId.value }]
    })
    // Invalidate ERC20 balance queries (for USDC and other tokens)
    await queryClient.invalidateQueries({
      queryKey: ['readContract', { address: teamStore.currentTeam.safeAddress }]
    })
    // Force refetch Safe info
    await refetch()
  }
}

const openTransferModal = () => {
  transferModal.value = { mount: true, show: true }
}

// const closeTransferModal = () => {
//   transferModal.value = { mount: false, show: false }
// }

// Watch for Safe address changes
watch(
  () => teamStore.currentTeam?.safeAddress,
  () => {
    if (teamStore.currentTeam?.safeAddress) {
      refetch()
    }
  }
)

// Watch for chain changes
watch(chainId, () => {
  if (teamStore.currentTeam?.safeAddress) {
    refetch()
  }
})

// Watch for errors
watch(error, (newError) => {
  if (newError) {
    console.error('Safe error:', newError)
  }
})

onMounted(() => {
  if (teamStore.currentTeam?.safeAddress) {
    refetch()
  }
})
</script>
