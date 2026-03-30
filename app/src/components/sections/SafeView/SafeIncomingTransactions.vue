<template>
  <UCard data-test="incoming-transfers-card">
    <template #header>Deposits</template>
    <UTable
      :data="incomingTransfers || []"
      :columns="columns"
      :loading="isLoading"
      empty="No incoming transfers found"
      data-test="incoming-transfers-table"
    >
      <!-- Type Column -->
      <template #type-cell="{ row: { original: row } }">
        <div class="flex items-center gap-2">
          <span
            class="badge badge-sm"
            :class="{
              'badge-success': row.type === 'ETHER_TRANSFER',
              'badge-info': row.type === 'ERC20_TRANSFER',
              'badge-warning': row.type === 'ERC721_TRANSFER'
            }"
          >
            {{ formatSafeTransferType(row.type) }}
          </span>
          <span v-if="row.tokenInfo" class="text-xs text-gray-500">
            {{ row.tokenInfo.symbol }}
          </span>
        </div>
      </template>

      <!-- From Column -->
      <template #from-cell="{ row: { original: row } }">
        <TransferSenderCell :address="row.from" />
      </template>

      <!-- Amount Column -->
      <template #amount-cell="{ row: { original: row } }">
        <span class="font-medium">
          {{ formatSafeTransferAmount(row as SafeIncomingTransfer) }}
        </span>
      </template>

      <!-- Date Column -->
      <template #executionDate-cell="{ row: { original: row } }">
        <span class="text-sm text-gray-600">
          {{ formatDateShort(row.executionDate) }}
        </span>
      </template>

      <!-- Transaction Hash Column -->
      <template #transactionHash-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.transactionHash" type="transaction" slice />
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import AddressToolTip from '@/components/AddressToolTip.vue'
import TransferSenderCell from './TransferSenderCell.vue'
import type { TableColumn } from '@nuxt/ui'
import { useGetSafeIncomingTransfersQuery } from '@/queries/safe.queries'
import { formatSafeTransferType, formatSafeTransferAmount } from '@/utils/safe'
import { formatDateShort } from '@/utils/dayUtils'
import type { SafeIncomingTransfer } from '@/types'

interface Props {
  address: Address
}

const props = defineProps<Props>()

// Define table columns
const columns: TableColumn<SafeIncomingTransfer>[] = [
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'executionDate', header: 'Date', enableSorting: true },
  { accessorKey: 'transactionHash', header: 'Tx Hash' }
]

// Fetch incoming transfers
const { data: incomingTransfers, isLoading } = useGetSafeIncomingTransfersQuery({
  pathParams: { safeAddress: computed(() => props.address) },
  queryParams: { limit: 50 }
})
</script>
