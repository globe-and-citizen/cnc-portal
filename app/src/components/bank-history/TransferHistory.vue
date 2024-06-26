<template>
  <div id="transfer">
    <h2>Transfer History</h2>
    <SkeletonLoading v-if="transferEventLoading" class="w-full h-96 mt-5" />
    <div v-if="!transferEventLoading" class="overflow-x-auto bg-base-100 mt-5">
      <table class="table table-zebra text-center">
        <!-- head -->
        <thead>
          <tr class="font-bold text-lg">
            <th>No</th>
            <th>Sender</th>
            <th>To</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody v-if="(transferEvents?.length ?? 0) > 0">
          <tr
            v-for="(transferEvent, index) in transferEvents"
            v-bind:key="transferEvent.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(transferEvent.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ transferEvent.data[0] }}</td>
            <td class="truncate max-w-48">{{ transferEvent.data[1] }}</td>
            <td>
              {{ web3Library.formatEther(transferEvent.data[2]) }} {{ NETWORK.currencySymbol }}
            </td>
            <td>{{ transferEvent.date }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="5">No transfer transactions</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import type { EventResult } from '@/types'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { NETWORK } from '@/constant'

const web3Library = EthersJsAdapter.getInstance()
defineProps<{
  transferEvents: EventResult[]
  transferEventLoading: boolean
}>()

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
