<template>
  <h2>SendTip Transactions</h2>
  <SkeletonLoading v-if="sendTipLoading" class="w-full h-96 p-5" />
  <div v-else class="overflow-x-auto bg-base-100 p-5" data-test="table-send-tip-transactions">
    <table class="table table-zebra">
      <!-- head -->
      <thead>
        <tr class="font-bold text-lg">
          <th>N°</th>
          <th>From</th>
          <th>Team Addresses</th>
          <th>Total Tip</th>
          <th class="truncate max-w-12">Tip Per Address</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody v-if="(sendTipEvents?.length ?? 0) > 0">
        <tr
          v-for="(sendTipEvent, index) in sendTipEvents"
          v-bind:key="sendTipEvent.txHash"
          class="cursor-pointer hover"
          @click="showTxDetail(sendTipEvent.txHash)"
        >
          <td>{{ index + 1 }}</td>
          <td class="truncate max-w-48">{{ sendTipEvent.data[0] }}</td>
          <td>
            <ul v-for="(address, index) in sendTipEvent.data[1]" :key="index">
              <li>{{ address }}</li>
            </ul>
          </td>
          <td>{{ ethers.formatEther(sendTipEvent.data[2]) }} {{ NETWORK.currencySymbol }}</td>
          <td>{{ ethers.formatEther(sendTipEvent.data[3]) }} {{ NETWORK.currencySymbol }}</td>
          <td>{{ sendTipEvent.date }}</td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr>
          <td class="text-center font-bold text-lg" colspan="6">No SendTip Transactions</td>
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
  events: sendTipEvents,
  getEvents: getSendTipEvents,
  loading: sendTipLoading,
  error: sendTipError
} = useTipEvents()

onMounted(async () => {
  getSendTipEvents(TipsEventType.SendTip)
})

watch(sendTipError, () => {
  if (sendTipError.value) {
    addErrorToast('Failed to get send tip events')
  }
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
