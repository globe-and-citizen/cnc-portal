<template>
  <div id="transfer">
    <SkeletonLoading v-if="loading" class="w-full h-96 mt-5" />
    <div v-if="!loading" class="overflow-x-auto bg-base-100 mt-5">
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
        <tbody v-if="(events?.length ?? 0) > 0">
          <tr
            v-for="(event, index) in events"
            v-bind:key="event.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(event.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ event.data[0] }}</td>
            <td class="truncate max-w-48">{{ event.data[1] }}</td>
            <td class="truncate max-w-48">{{ event.data[2] }}</td>
            <td>{{ event.date }}</td>
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
import { useBankEvents } from '@/composables/bank'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/useToastStore'
import { BankEventType } from '@/types'
import { onMounted, watch } from 'vue'

const { addErrorToast } = useToastStore()
const props = defineProps<{
  bankAddress: string
}>()
const { getEvents, error, events, loading } = useBankEvents(props.bankAddress)

onMounted(async () => {
  await getEvents(BankEventType.TipsAddressChanged)
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
