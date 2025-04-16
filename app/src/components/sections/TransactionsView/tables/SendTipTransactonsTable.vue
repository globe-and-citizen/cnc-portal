<template>
  <h2>SendTip Transactions</h2>
  <SkeletonLoading v-if="loading" class="w-full h-96 p-5" />
  <div v-else class="overflow-x-auto bg-base-100 p-5" data-test="table-send-tip-transactions">
    <TableComponent
      :rows="
        events?.map((event, index) => ({
          index: index + 1,
          from: event.args.from,
          teamMembers: event.args.teamMembers,
          totalAmount: `${formatEther(event.args.totalAmount!)} ${NETWORK.currencySymbol}`,
          amountPerAddress: `${formatEther(event.args.amountPerAddress!)} ${NETWORK.currencySymbol}`,
          date: dates[index],
          transactionHash: event.transactionHash
        })) ?? []
      "
      :columns="[
        { key: 'index', label: 'N°' },
        { key: 'from', label: 'From' },
        { key: 'teamMembers', label: 'Team Addresses' },
        { key: 'totalAmount', label: 'Total Tip' },
        { key: 'amountPerAddress', label: 'Tip Per Address', class: 'truncate max-w-12' },
        { key: 'date', label: 'Date' }
      ]"
      :loading="loading"
      @row-click="(row) => showTxDetail(row.transactionHash)"
    >
      <template #from-data="{ row }">
        <span class="truncate max-w-48" data-test="data-row-from">{{ row.from }}</span>
      </template>

      <template #teamMembers-data="{ row }">
        <ul>
          <li v-for="(address, index) in row.teamMembers" :key="index" data-test="data-row-member">
            {{ address }}
          </li>
        </ul>
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
import { config } from '@/wagmi.config'
import { getBlock, getLogs } from 'viem/actions'
import TableComponent from '@/components/TableComponent.vue'

const client = config.getClient()
const { addErrorToast } = useToastStore()
const events = ref<
  GetLogsReturnType<{
    readonly name: 'SendTip'
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
        'event SendTip(address from, address[] teamMembers, uint256 totalAmount, uint256 amountPerAddress)'
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
    addErrorToast('Failed to get send tip events')
  }
})

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}
</script>
