<template>
  <div id="send-to-wallet">
    <h2>Send to Wallet History</h2>
    <SkeletonLoading v-if="loading" class="w-full h-96 mt-5" />
    <div v-if="!loading" class="overflow-x-auto bg-base-100 mt-5">
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
        <tbody v-if="(events?.length ?? 0) > 0">
          <tr
            v-for="(event, index) in events"
            v-bind:key="event.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(event.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ event.data[0] }}</td>
            <td>
              <ul v-for="(address, index) in event.data[1]" :key="index">
                <li>{{ address }}</li>
              </ul>
            </td>
            <td>
              {{ web3Library.formatEther(event.data[2]) }}
              {{ NETWORK.currencySymbol }}
            </td>
            <td>{{ event.date }}</td>
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
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/useToastStore'
import { useBankEvents } from '@/composables/bank'
import { onMounted, watch } from 'vue'
import { BankEventType } from '@/types'

const web3Library = EthersJsAdapter.getInstance()
const { addErrorToast } = useToastStore()
const props = defineProps<{
  bankAddress: string
}>()
const { getEvents, error, events, loading } = useBankEvents(props.bankAddress)

onMounted(async () => {
  await getEvents(BankEventType.PushTip)
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}

watch(error, () => {
  if (error.value) {
    addErrorToast(error.value.reason ? error.value.reason : 'Failed to get transfer events')
  }
})
</script>
