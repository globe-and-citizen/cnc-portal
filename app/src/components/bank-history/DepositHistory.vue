<template>
  <div id="deposit">
    <h2>Deposit History</h2>
    <SkeletonLoading v-if="depositEventLoading" class="w-full h-96 mt-5" />
    <div v-if="!depositEventLoading" class="overflow-x-auto bg-base-100 mt-5">
      <table class="table table-zebra text-center">
        <!-- head -->
        <thead>
          <tr class="font-bold text-lg">
            <th>No</th>
            <th>Depositor</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody v-if="(depositEvents?.length ?? 0) > 0">
          <tr
            v-for="(depositEvent, index) in depositEvents"
            v-bind:key="depositEvent.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(depositEvent.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ depositEvent.data[0] }}</td>
            <td>
              {{ web3Library.formatEther(depositEvent.data[1]) }} {{ NETWORK.currencySymbol }}
            </td>
            <td>{{ depositEvent.date }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="4">No Deposit transactions</td>
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
import { NETWORK } from '@/constant';

const web3Library = EthersJsAdapter.getInstance()
defineProps<{
  depositEvents: EventResult[]
  depositEventLoading: boolean
}>()

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
