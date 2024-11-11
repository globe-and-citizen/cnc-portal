<template>
  <h2>PushTip Transactions</h2>
  <SkeletonLoading v-if="loading" class="w-full h-96 p-5" />
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
      <tbody v-if="(events?.length ?? 0) > 0">
        <tr
          v-for="(event, index) in events"
          v-bind:key="event.transactionHash"
          data-test="table-body-row"
          ass="cursor-pointer hover"
          @click="showTxDetail(event.transactionHash)"
        >
          <td data-test="data-row-number">{{ index + 1 }}</td>
          <td data-test="data-row-from" class="truncate max-w-48">{{ event.args.from }}</td>
          <td>
            <ul v-for="(address, index) in event.args.teamMembers" :key="index">
              <li data-test="data-row-member">{{ address }}</li>
            </ul>
          </td>
          <td data-test="data-row-total-amount">
            {{ formatEther(event.args.totalAmount!) }} {{ NETWORK.currencySymbol }}
          </td>
          <td data-test="data-row-amount-per-address">
            {{ formatEther(event.args.amountPerAddress!) }} {{ NETWORK.currencySymbol }}
          </td>
          <td data-test="data-row-date">{{ dates[index] }}</td>
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
import { onMounted, ref, watch } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { NETWORK, TIPS_ADDRESS } from '@/constant'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { formatEther, parseAbiItem, type Address, type GetLogsReturnType } from 'viem'
import { config } from '@/wagmi.config'
import { getBlock, getLogs } from 'viem/actions'

const client = config.getClient()
const { addErrorToast } = useToastStore()
const events = ref<
  GetLogsReturnType<{
    readonly name: 'PushTip'
    readonly type: 'event'
    readonly inputs: readonly [
      {
        readonly type: 'address'
        readonly name: 'from'
      },
      {
        readonly type: 'address[]'
        readonly name: 'teamMembers'
      },
      {
        readonly type: 'uint256'
        readonly name: 'totalAmount'
      },
      {
        readonly type: 'uint256'
        readonly name: 'amountPerAddress'
      }
    ]
  }>
>([])
const dates = ref<string[]>([])
const loading = ref(false)
const error = ref<unknown | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    events.value = await getLogs(client, {
      address: TIPS_ADDRESS as Address,
      event: parseAbiItem(
        'event PushTip(address from, address[] teamMembers, uint256 totalAmount, uint256 amountPerAddress)'
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

watch(error, () => {
  if (error.value) {
    addErrorToast('Failed to get push tip events')
  }
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
