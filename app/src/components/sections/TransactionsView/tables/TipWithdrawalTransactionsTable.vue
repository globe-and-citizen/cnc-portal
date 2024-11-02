<template>
  <h2>TipWithdrawal Transactions</h2>
  <SkeletonLoading v-if="loading" class="w-full h-96 p-5" />
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
      <tbody v-if="(events?.length ?? 0) > 0">
        <tr
          v-for="(event, index) in events"
          v-bind:key="event.transactionHash"
          class="cursor-pointer hover"
          @click="showTxDetail(event.transactionHash)"
        >
          <td>{{ index + 1 }}</td>
          <td class="truncate max-w-48">{{ event.args.to }}</td>
          <td>{{ formatEther(event.args.amount!) }} {{ NETWORK.currencySymbol }}</td>
          <td>{{ dates[index] }}</td>
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
import { onMounted, ref, watch } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { NETWORK, TIPS_ADDRESS } from '@/constant'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { formatEther, parseAbiItem, type Address, type GetLogsReturnType } from 'viem'
import { getBlock, getLogs } from 'viem/actions'
import { config } from '@/wagmi.config'

const client = config.getClient()
const { addErrorToast } = useToastStore()
const events = ref<
  GetLogsReturnType<{
    readonly name: 'TipWithdrawal'
    readonly type: 'event'
    readonly inputs: readonly [
      {
        readonly type: 'address'
        readonly name: 'to'
      },
      {
        readonly type: 'uint256'
        readonly name: 'amount'
      }
    ]
  }>
>([])
const dates = ref<string[]>([])
const loading = ref(false)
const error = ref<unknown | null>(null)

onMounted(async () => {
  try {
    events.value = await getLogs(client, {
      address: TIPS_ADDRESS as Address,
      event: parseAbiItem('event TipWithdrawal(address to, uint256 amount)'),
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
})

watch(error, () => {
  if (error.value) {
    addErrorToast('Failed to get withdrawal tip events')
  }
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
