<template>
  <h2>TipWithdrawal Transactions</h2>
  <SkeletonLoading v-if="withdrawalTipLoading" class="w-full h-96 p-5" />
  <div v-else class="overflow-x-auto bg-base-100 p-5" data-test="table-tip-withdrawal-transactions">
    <table class="table table-zebra">
      <!-- head -->
      <thead>
        <tr class="font-bold text-lg">
          <th>N°</th>
          <th>To</th>
          <th>Amount</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody v-if="(withdrawalTipEvents?.length ?? 0) > 0">
        <tr
          v-for="(withdrawalTipEvent, index) in withdrawalTipEvents"
          v-bind:key="withdrawalTipEvent.txHash"
          class="cursor-pointer hover"
          @click="showTxDetail(withdrawalTipEvent.txHash)"
        >
          <td>{{ index + 1 }}</td>
          <td class="truncate max-w-48">{{ withdrawalTipEvent.data[0] }}</td>
          <td>{{ ethers.formatEther(withdrawalTipEvent.data[1]) }} {{ NETWORK.currencySymbol }}</td>
          <td>{{ withdrawalTipEvent.date }}</td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr>
          <td class="text-center font-bold text-lg" colspan="4">No TipWithdrawal Transactions</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { ethers } from 'ethers'
import { useTipEvents } from '@/composables/tips'
import { TipsEventType } from '@/types'
import { useToastStore } from '@/stores/useToastStore'
import { NETWORK } from '@/constant'
import SkeletonLoading from '@/components/SkeletonLoading.vue'

const { addErrorToast } = useToastStore()

const {
  events: withdrawalTipEvents,
  getEvents: getWithdrawalTipEvents,
  loading: withdrawalTipLoading,
  error: withdrawalTipError
} = useTipEvents()

onMounted(async () => {
  getWithdrawalTipEvents(TipsEventType.TipWithdrawal)
})

watch(withdrawalTipError, () => {
  if (withdrawalTipError.value) {
    addErrorToast('Failed to get withdrawal tip events')
  }
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
