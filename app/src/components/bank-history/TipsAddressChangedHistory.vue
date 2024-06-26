<template>
  <div id="transfer">
    <h2>Tips Address Changed History</h2>
    <SkeletonLoading v-if="tipsAddressChangedEventLoading" class="w-full h-96 mt-5" />
    <div v-if="!tipsAddressChangedEventLoading" class="overflow-x-auto bg-base-100 mt-5">
      <table class="table table-zebra text-center">
        <!-- head -->
        <thead>
          <tr class="font-bold text-lg">
            <th>No</th>
            <th>Owner Address</th>
            <th>Old Tips Address</th>
            <th>New Tips Address</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody v-if="(tipsAddressChangedEvents?.length ?? 0) > 0">
          <tr
            v-for="(tipsAddressChangedEvent, index) in tipsAddressChangedEvents"
            v-bind:key="tipsAddressChangedEvent.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(tipsAddressChangedEvent.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ tipsAddressChangedEvent.data[0] }}</td>
            <td class="truncate max-w-48">{{ tipsAddressChangedEvent.data[1] }}</td>
            <td class="truncate max-w-48">{{ tipsAddressChangedEvent.data[2] }}</td>
            <td>{{ tipsAddressChangedEvent.date }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="5">No tips address transactions</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import type { EventResult } from '@/types'
import { NETWORK } from '@/constant'

defineProps<{
  tipsAddressChangedEvents: EventResult[]
  tipsAddressChangedEventLoading: boolean
}>()

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
