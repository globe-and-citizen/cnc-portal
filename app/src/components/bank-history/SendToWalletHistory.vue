<template>
  <div id="send-to-wallet">
    <h2>Send to Wallet History</h2>
    <SkeletonLoading v-if="sendToWalletEventLoading" class="w-full h-96 mt-5" />
    <div v-if="!sendToWalletEventLoading" class="overflow-x-auto bg-base-100 mt-5">
      <table class="table table-zebra text-center">
        <!-- head -->
        <thead>
          <tr class="font-bold text-lg">
            <th>No</th>
            <th>Owner Address</th>
            <th>Member Addresses</th>
            <th>Total Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody v-if="(sendToWalletEvents?.length ?? 0) > 0">
          <tr
            v-for="(sendToWalletEvent, index) in sendToWalletEvents"
            v-bind:key="sendToWalletEvent.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(sendToWalletEvent.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ sendToWalletEvent.data[0] }}</td>
            <td>
              <ul v-for="(address, index) in sendToWalletEvent.data[1]" :key="index">
                <li>{{ address }}</li>
              </ul>
            </td>
            <td>
              {{ web3Library.formatEther(sendToWalletEvent.data[2]) }}
              {{ NETWORK.currencySymbol }}
            </td>
            <td>{{ sendToWalletEvent.date }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="4">No send to wallet history</td>
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
  sendToWalletEvents: EventResult[]
  sendToWalletEventLoading: boolean
}>()

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
