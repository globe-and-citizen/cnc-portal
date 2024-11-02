<template>
  <div id="deposit">
    <SkeletonLoading v-if="loading" class="w-full h-96 mt-5" />
    <div v-if="!loading" class="overflow-x-auto bg-base-100 mt-5">
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
        <tbody data-test="data-exists" v-if="(events?.length ?? 0) > 0">
          <tr
            v-for="(event, index) in events"
            v-bind:key="event.transactionHash!"
            class="cursor-pointer hover"
            @click="showTxDetail(event.transactionHash!)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ event.args.depositor }}</td>
            <td>{{ formatEther(event.args.amount!) }} {{ NETWORK.currencySymbol }}</td>
            <td>{{ dates[index] }}</td>
          </tr>
        </tbody>
        <tbody data-test="data-not-exists" v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="4" data-test="empty-row">
              No Deposit transactions
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import { onMounted, ref, watch } from 'vue'
import { formatEther, parseAbiItem, type Address, type GetLogsReturnType } from 'viem'
import { getBlock, getLogs } from 'viem/actions'
import { config } from '@/wagmi.config'
import { useToastStore } from '@/stores'

const client = config.getClient()
const props = defineProps<{
  bankAddress: string
}>()
const loading = ref(false)
const error = ref<unknown | null>(null)
const { addErrorToast } = useToastStore()
const events = ref<
  GetLogsReturnType<{
    readonly name: 'Deposited'
    readonly type: 'event'
    readonly inputs: readonly [
      {
        readonly type: 'address'
        readonly name: 'depositor'
        readonly indexed: true
      },
      {
        readonly type: 'uint256'
        readonly name: 'amount'
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
      event: parseAbiItem('event Deposited(address indexed depositor, uint256 amount)'),
      fromBlock: 'earliest',
      toBlock: 'latest'
    })
    dates.value = await Promise.all(
      events.value.map(async (event) => {
        const block = await getBlock(client, { blockHash: event.blockHash })
        return new Date(parseInt(block.timestamp.toString()) * 1000).toLocaleString()
      })
    )
  } catch (err) {
    error.value = err
  }
  loading.value = false
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}

watch(error, () => {
  if (error.value) {
    addErrorToast('Failed to get deposit events')
  }
})
</script>
