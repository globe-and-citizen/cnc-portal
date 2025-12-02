<template>
  <div class="container mx-auto px-4 py-8 space-y-8">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Micro Payments management</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Manage and withdraw collected fees
        </p>
      </div>

      <UButton
        v-if="isFeeCollectorOwner"
        color="primary"
        icon="i-heroicons-arrow-path"
        :loading="isRefreshing"
        @click="handleRefresh"
      >
        Refresh
      </UButton>
    </div>

    <!-- Stats Cards -->
    <FeeCollectorStats :native-balance="(nativeBalance as bigint | undefined) ?? 0n" />

    <!-- Token Holdings Table -->
    <TokenHoldingsTable
      :tokens="tokenList"
      :is-loading="isLoadingNativeBalance"
      :is-owner="isFeeCollectorOwner"
      @open-batch-modal="openBatchWithdrawModal"
    />

    <!-- Withdraw Modal -->
    <WithdrawModal
      v-model:is-open="isWithdrawModalOpen"
      v-model:amount="withdrawAmount"
      :selected-token="batchSelectedToken ?? undefined"
      :available-tokens="tokenList"
      :is-loading-withdraw="isLoadingWithdraw"
      :is-confirming-withdraw="isConfirmingWithdraw"
      @close="closeWithdrawModal"
      @submit="handleWithdraw"
      @set-max="setMaxAmount"
      @set-percent="setPercentAmount"
      @select-token="selectBatchToken"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFeeCollector } from '@/composables/useFeeCollector'
import { useTokenWithdraw } from '@/composables/useTokenWithdraw'
import { buildTokenList } from '@/utils/tokenHelpers'
import { FEE_COLLECTOR_SUPPORTED_TOKENS } from '@/constant'
import type { TokenDisplay } from '@/types/token'
import FeeCollectorStats from './FeeCollectorStats.vue'
import TokenHoldingsTable from './TokenHoldingsTable.vue'
import WithdrawModal from './WithdrawModal.vue'

// Debug

// Composables
const toast = useToast()
const {
  isFeeCollectorOwner,
  nativeBalance,
  usdcBalance,
  usdtBalance,
  isLoadingNativeBalance,
  refetchAll
} = useFeeCollector()

const {
  withdraw,
  isLoadingWithdraw,
  isConfirmingWithdraw,
  isConfirmedWithdraw
} = useTokenWithdraw()

// State
const isWithdrawModalOpen = ref(false)
const batchSelectedToken = ref<TokenDisplay | null>(null)
const withdrawAmount = ref('')
const isRefreshing = ref(false)

// Computed
const tokenList = computed(() => {
  const supportedTokensBalances = []
  console.log("FEE_COLLECTOR_SUPPORTED_TOKENS:", usdcBalance.value, usdtBalance.value)
  // Build array of supported tokens with their balances
  if (usdcBalance.value !== undefined && FEE_COLLECTOR_SUPPORTED_TOKENS[0]) {
    supportedTokensBalances.push({
      address: FEE_COLLECTOR_SUPPORTED_TOKENS[0],
      balance: usdcBalance.value as bigint
    })
  }
  
  if (usdtBalance.value !== undefined && FEE_COLLECTOR_SUPPORTED_TOKENS[1]) {
    supportedTokensBalances.push({
      address: FEE_COLLECTOR_SUPPORTED_TOKENS[1],
      balance: usdtBalance.value as bigint
    })
  }
  console.log("the supported token balances are: ==", supportedTokensBalances)

  return buildTokenList(
    nativeBalance.value as bigint | undefined,
    supportedTokensBalances
  )
})

// Methods
const openBatchWithdrawModal = () => {
  batchSelectedToken.value = null
  withdrawAmount.value = ''
  isWithdrawModalOpen.value = true
}

const closeWithdrawModal = () => {
  isWithdrawModalOpen.value = false
  batchSelectedToken.value = null
  withdrawAmount.value = ''
}

const selectBatchToken = (token: TokenDisplay) => {
  batchSelectedToken.value = token
  withdrawAmount.value = ''
}

const setMaxAmount = () => {
  if (batchSelectedToken.value) {
    withdrawAmount.value = batchSelectedToken.value.formattedBalance
  }
}

const setPercentAmount = (percent: number) => {
  if (batchSelectedToken.value) {
    const maxAmount = parseFloat(batchSelectedToken.value.formattedBalance)
    const percentAmount = (maxAmount * percent) / 100
    withdrawAmount.value = percentAmount.toFixed(batchSelectedToken.value.decimals)
  }
}

const handleWithdraw = () => {
  if (!batchSelectedToken.value || !withdrawAmount.value) return

  withdraw(batchSelectedToken.value, withdrawAmount.value)
}

const handleRefresh = async () => {
  isRefreshing.value = true
  try {
    await refetchAll()
    toast.add({
      title: 'Success',
      description: 'Balances refreshed successfully',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to refresh balances',
      color: 'error'
    })
  } finally {
    isRefreshing.value = false
  }
}

// Watchers
watch(isConfirmedWithdraw, (confirmed) => {
  if (confirmed) {
    toast.add({
      title: 'Success',
      description: 'Withdrawal completed successfully',
      color: 'success'
    })
    closeWithdrawModal()
    refetchAll()
  }
})
</script>