<template>
  <h2>PushTip Transactions</h2>
  <SkeletonLoading v-if="pushTipLoading" class="w-full h-96 p-5" />
  <div v-else class="overflow-x-auto bg-base-100 p-5" data-test="table-push-tip-transactions">
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
      <tbody v-if="(pushTipEvents?.length ?? 0) > 0">
        <tr
          v-for="(pushTipEvent, index) in pushTipEvents"
          v-bind:key="pushTipEvent.txHash"
          class="cursor-pointer hover"
          @click="showTxDetail(pushTipEvent.txHash)"
        >
          <td>{{ index + 1 }}</td>
          <td class="truncate max-w-48">{{ pushTipEvent.data[0] }}</td>
          <td>
            <ul v-for="(address, index) in pushTipEvent.data[1]" :key="index">
              <li>{{ address }}</li>
            </ul>
          </td>
          <td>{{ ethers.formatEther(pushTipEvent.data[2]) }} {{ NETWORK.currencySymbol }}</td>
          <td>{{ ethers.formatEther(pushTipEvent.data[3]) }} {{ NETWORK.currencySymbol }}</td>
          <td>{{ pushTipEvent.date }}</td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr>
          <td class="text-center font-bold text-lg" colspan="6">No PushTip Transactions</td>
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
  events: pushTipEvents,
  getEvents: getPushTipEvents,
  loading: pushTipLoading,
  error: pushTipError
} = useTipEvents()

onMounted(async () => {
  await Promise.all([getPushTipEvents(TipsEventType.PushTip)])
})

watch(pushTipError, () => {
  if (pushTipError.value) {
    addErrorToast('Failed to get push tip events')
  }
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
