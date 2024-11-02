<template>
  <div id="send-to-wallet">
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
            v-bind:key="event.transactionHash"
            class="cursor-pointer hover"
            @click="showTxDetail(event.transactionHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ event.args.addressWhoPushes }}</td>
            <td>
              <ul v-for="(address, index) in event.args.teamMembers" :key="index">
                <li>{{ address }}</li>
              </ul>
            </td>
            <td>
              {{ formatEther(event.args.totalAmount!) }}
              {{ NETWORK.currencySymbol }}
            </td>
            <td>{{ dates[index] }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="5">No send to wallet history</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { config } from '@/wagmi.config'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/useToastStore'
import { onMounted, watch } from 'vue'
import { formatEther, parseAbiItem, type Address, type GetLogsReturnType } from 'viem'
import { ref } from 'vue'
import { getBlock, getLogs } from 'viem/actions'

const client = config.getClient()
const { addErrorToast } = useToastStore()
const props = defineProps<{
  bankAddress: string
}>()
const loading = ref(false)
const error = ref<unknown | null>(null)
const events = ref<
  GetLogsReturnType<{
    readonly name: 'PushTip'
    readonly type: 'event'
    readonly inputs: readonly [
      {
        readonly type: 'address'
        readonly name: 'addressWhoPushes'
        readonly indexed: true
      },
      {
        readonly type: 'address[]'
        readonly name: 'teamMembers'
      },
      {
        readonly type: 'uint256'
        readonly name: 'totalAmount'
      }
    ]
  }>
>([])
const dates = ref<string[]>([])

onMounted(async () => {
  loading.value = true
  try {
    events.value = await getLogs(client, {
      address: props.bankAddress as Address,
      event: parseAbiItem(
        'event PushTip(address indexed addressWhoPushes, address[] teamMembers, uint256 totalAmount)'
      ),
      fromBlock: 'earliest',
      toBlock: 'latest'
    })
    dates.value = await Promise.all(
      events.value.map(async (event) => {
        const block = await getBlock(client, {
          blockHash: event.blockHash
        })
        return new Date(parseInt(block.timestamp.toString()) * 1000).toLocaleString()
      })
    )
  } catch (e) {
    error.value = e
  }
  loading.value = false
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}

watch(error, () => {
  if (error.value) {
    addErrorToast('Failed to get transfer events')
  }
})
</script>
