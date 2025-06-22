<template>
  <div>
    <CardComponent title="Vesting Stats">
      <div class="flex flex-col justify-around gap-2 w-full" data-test="vesting-stats">
        <TableComponent
          :rows="tokenSummaryRows"
          :columns="tokenSummaryColumns"
          :sticky="true"
          :showPagination="true"
        >
          <template #totalReleased-data="{ row }">
            <span class="flex items-center gap-1 text-sm text-gray-700">
              {{ row.totalReleased }}
              <span class="text-xs">{{ row.tokenSymbol }}</span>
            </span>
          </template>
          <template #totalVested-data="{ row }">
            <span class="flex items-center gap-1 text-sm text-gray-700">
              {{ row.totalVested }}
              <span class="text-xs">{{ row.tokenSymbol }}</span>
            </span>
          </template>
        </TableComponent>
      </div>
    </CardComponent>
  </div>
</template>

<script setup lang="ts">
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import { computed } from 'vue'
import { type VestingRow, type TokenSummary } from '@/types/vesting'
const props = defineProps<{
  vestings: VestingRow[]
  symbol: string
}>()

// Define columns including the new "Actions" column

const tokenSummaryColumns = [
  { key: 'symbol', label: 'Token Symbol', sortable: false },
  { key: 'totalVested', label: 'Total Vested', sortable: false },
  { key: 'totalReleased', label: 'Total Released', sortable: false }
]
const tokenSummaryRows = computed(() => {
  const summaryMap: Record<string, TokenSummary> = {}
  for (const row of props.vestings ?? []) {
    if (!summaryMap[props.symbol]) {
      summaryMap[props.symbol] = {
        symbol: props.symbol,
        totalVested: 0,
        totalReleased: 0
      }
    }
    summaryMap[props.symbol].totalVested += row.totalAmount
    summaryMap[props.symbol].totalReleased += row.released
  }

  return Object.values(summaryMap)
})
</script>
