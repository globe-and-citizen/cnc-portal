<template>
  <h2>TipWithdrawal Transactions</h2>
  <SkeletonLoading v-if="loading" class="w-full h-96 p-5" />
  <div v-else class="overflow-x-auto bg-base-100 p-5" data-test="table-tip-withdrawal-transactions">
    <TableComponent
      :rows="
        events?.map((event, index) => ({
          index: index + 1,
          to: event.args.to,
          amount: `${formatEther(event.args.amount!)} ${NETWORK.currencySymbol}`,
          date: dates[index],
          transactionHash: event.transactionHash
        })) ?? []
      "
      :columns="[
        { key: 'index', label: 'N°' },
        { key: 'to', label: 'To' },
        { key: 'amount', label: 'Amount' },
        { key: 'date', label: 'Date' }
      ]"
      :loading="loading"
      @row-click="(row) => showTxDetail(row.transactionHash)"
    >
      <template #to-data="{ row }">
        <span class="truncate max-w-48" data-test="data-row-to">{{ row.to }}</span>
      </template>
    </TableComponent>
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
import TableComponent from '@/components/TableComponent.vue'

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
  loading.value = true
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
  loading.value = false
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
