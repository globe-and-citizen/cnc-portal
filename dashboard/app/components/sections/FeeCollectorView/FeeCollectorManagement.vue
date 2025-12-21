<template>
  <div class="container mx-auto px-4 py-8 space-y-8">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          Micro Payments management
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Manage and withdraw collected fees
        </p>
      </div>
    </div>

    <!-- Stats Cards -->
    <FeeCollectorStats />

    <!-- Token Holdings Table -->
    <TokenHoldingsTable @open-batch-modal="isWithdrawModalOpen = true" />

    <!-- Withdraw Modal -->
    <WithdrawModal
      v-model:is-open="isWithdrawModalOpen"
      :is-loading-withdraw="isLoadingWithdraw"
      :is-confirming-withdraw="isConfirmingWithdraw"
      @close="isWithdrawModalOpen = false"
      @withdraw="handleWithdraw"
    />

    <!-- Fee Config List -->
    <FeeConfigList />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
// import { useFeeCollector } from '@/composables/useFeeCollector'
import { useTokenWithdraw } from '@/composables/useTokenWithdraw'
import type { TokenDisplay } from '@/types/token'
import FeeCollectorStats from './FeeCollectorStats.vue'
import TokenHoldingsTable from './TokenHoldingsTable.vue'
import WithdrawModal from './WithdrawModal.vue'
import FeeConfigList from './FeeConfigList.vue'

const toast = useToast()

// Composables
// const { isFeeCollectorOwner, refetchAll } = useFeeCollector()

const {
  withdraw,
  isLoadingWithdraw,
  isConfirmingWithdraw,
  isConfirmedWithdraw
} = useTokenWithdraw()

// State
const isWithdrawModalOpen = ref(false)
// const isRefreshing = ref(false)

// Handlers
const handleWithdraw = (token: TokenDisplay, amount: string) => {
  withdraw(token, amount)
}

// const handleRefresh = async () => {
//   isRefreshing.value = true
//   try {
//     await refetchAll()
//     toast.add({
//       title: 'Success',
//       description: 'Balances refreshed successfully',
//       color: 'success'
//     })
//   } catch (error) {
//     toast.add({
//       title: 'Error',
//       description: 'Failed to refresh balances',
//       color: 'error'
//     })
//     console.log('error ====', error)
//   } finally {
//     isRefreshing.value = false
//   }
// }

// Watch for successful withdrawal
watch(isConfirmedWithdraw, (confirmed) => {
  if (confirmed) {
    toast.add({
      title: 'Success',
      description: 'Withdrawal completed successfully',
      color: 'success'
    })
    isWithdrawModalOpen.value = false
    // refetchAll()
  }
})
</script>
