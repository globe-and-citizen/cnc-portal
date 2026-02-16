<template>
  <CardComponent title="Deposits" data-test="incoming-transfers-card">
    <TableComponent
      :rows="incomingTransfers || []"
      :columns="columns"
      :loading="isLoading"
      :showPagination="true"
      :itemsPerPageProp="5"
      :emptyState="{
        label: 'No incoming transfers found'
      }"
      data-test="incoming-transfers-table"
    >
      <!-- Type Column -->
      <template #type-data="{ row }">
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
      <template #from-data="{ row }">
        <TransferSenderCell :address="row.from" />
      </template>

      <!-- Amount Column -->
      <template #amount-data="{ row }">
        <span class="font-medium">
          {{ formatSafeTransferAmount(row as SafeIncomingTransfer) }}
        </span>
      </template>

      <!-- Date Column -->
      <template #executionDate-data="{ row }">
        <span class="text-sm text-gray-600">
          {{ formatDateShort(row.executionDate) }}
        </span>
      </template>

      <!-- Transaction Hash Column -->
      <template #transactionHash-data="{ row }">
        <AddressToolTip :address="row.transactionHash" type="transaction" slice />
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import TransferSenderCell from './TransferSenderCell.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { useGetSafeIncomingTransfersQuery } from '@/queries/safe.queries'
import { formatSafeTransferType, formatSafeTransferAmount } from '@/utils/safe'
import { formatDateShort } from '@/utils/dayUtils'
import type { SafeIncomingTransfer } from '@/types'

interface Props {
  address: Address
}

const props = defineProps<Props>()

// Define table columns
const columns: TableColumn[] = [
  { key: 'type', label: 'Type' },
  { key: 'from', label: 'From' },
  { key: 'amount', label: 'Amount' },
  { key: 'executionDate', label: 'Date', sortable: true },
  { key: 'transactionHash', label: 'Tx Hash' }
]

// Fetch incoming transfers
const { data: incomingTransfers, isLoading } = useGetSafeIncomingTransfersQuery({
  pathParams: { safeAddress: computed(() => props.address) },
  queryParams: { limit: 50 }
})
</script>
