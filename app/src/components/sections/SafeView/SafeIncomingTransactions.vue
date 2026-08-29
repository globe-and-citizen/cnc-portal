<template>
  <UCard data-test="incoming-transfers-card">
    <template #header>
      <div>
        <h3 class="font-semibold">Deposits</h3>
        <p class="mt-1 text-sm text-gray-500">
          Assets received by the Safe do not require signer approval.
        </p>
      </div>
    </template>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Deposits could not be loaded"
      description="The approval queue is unaffected. Check your connection and try loading deposits again."
      data-test="safe-deposits-error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="outline"
          size="xs"
          label="Try again"
          data-test="retry-safe-deposits-button"
          @click="retryDeposits"
        />
      </template>
    </UAlert>

    <div
      v-else-if="isLoading"
      class="flex min-h-36 items-center justify-center gap-3 text-sm text-gray-500"
      role="status"
      aria-live="polite"
      data-test="safe-deposits-loading"
    >
      <UIcon name="i-lucide-loader-circle" class="text-primary h-7 w-7 animate-spin" />
      Loading deposits…
    </div>

    <div
      v-else-if="!incomingTransfers?.length"
      class="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center"
      data-test="safe-deposits-empty"
    >
      <UIcon name="i-lucide-inbox" class="text-primary h-7 w-7" />
      <p class="mt-3 font-medium">No deposits yet</p>
      <p class="mt-1 text-sm text-gray-500">
        Use “Deposit funds” above to send assets to this Safe.
      </p>
    </div>

    <template v-else>
      <div class="hidden overflow-x-auto md:block">
        <UTable :data="incomingTransfers" :columns="columns" data-test="incoming-transfers-table">
          <template #type-cell="{ row: { original: row } }">
            <div class="flex items-center gap-2">
              <UBadge
                size="sm"
                variant="subtle"
                :color="transferTypeColor(row.type)"
                :data-transfer-type="row.type"
                data-test="transfer-type-badge"
              >
                {{ formatSafeTransferType(row.type) }}
              </UBadge>
              <span
                v-if="row.tokenInfo"
                class="text-xs text-gray-500"
                data-test="safe-deposit-token-symbol"
              >
                {{ row.tokenInfo.symbol }}
              </span>
            </div>
          </template>
          <template #from-cell="{ row: { original: row } }">
            <TransferSenderCell :address="row.from" />
          </template>
          <template #amount-cell="{ row: { original: row } }">
            <span class="font-medium">{{ formatSafeTransferAmount(row) }}</span>
          </template>
          <template #executionDate-cell="{ row: { original: row } }">
            <span class="text-sm text-gray-600">{{ formatDateShort(row.executionDate) }}</span>
          </template>
          <template #transactionHash-cell="{ row: { original: row } }">
            <AddressToolTip :address="row.transactionHash" type="transaction" slice />
          </template>
        </UTable>
      </div>

      <ul class="space-y-3 md:hidden" data-test="safe-deposits-mobile-list">
        <li
          v-for="transfer in incomingTransfers"
          :key="transfer.transactionHash"
          class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold">{{ formatSafeTransferAmount(transfer) }}</p>
              <p class="mt-1 text-xs text-gray-500">
                {{ formatDateShort(transfer.executionDate) }}
              </p>
            </div>
            <UBadge :color="transferTypeColor(transfer.type)" variant="soft" size="sm">
              {{ formatSafeTransferType(transfer.type) }}
            </UBadge>
          </div>
          <div
            class="mt-4 flex items-center justify-between gap-3 border-t pt-3 dark:border-gray-800"
          >
            <TransferSenderCell :address="transfer.from" />
            <AddressToolTip :address="transfer.transactionHash" type="transaction" slice />
          </div>
        </li>
      </ul>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import type { TableColumn } from '@nuxt/ui'
import type { UBadgeColor } from '@/types/ui'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import TransferSenderCell from './TransferSenderCell.vue'
import { useGetSafeIncomingTransfersQuery } from '@/queries/safe.queries'
import { formatSafeTransferType, formatSafeTransferAmount } from '@/utils/safe'
import { formatDateShort } from '@/utils/dayUtils'
import type { SafeIncomingTransfer } from '@/types'

interface Props {
  address: Address
}

const props = defineProps<Props>()

const columns: TableColumn<SafeIncomingTransfer>[] = [
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'executionDate', header: 'Date', enableSorting: true },
  { accessorKey: 'transactionHash', header: 'On-chain transaction' }
]

const transferTypeColor = (type: SafeIncomingTransfer['type']): UBadgeColor => {
  if (type === 'ETHER_TRANSFER') return 'success'
  if (type === 'ERC20_TRANSFER') return 'info'
  if (type === 'ERC721_TRANSFER') return 'warning'
  return 'neutral'
}

const {
  data: incomingTransfers,
  isLoading,
  error,
  refetch
} = useGetSafeIncomingTransfersQuery({
  pathParams: { safeAddress: computed(() => props.address) },
  queryParams: { limit: 50 }
})

const retryDeposits = () => {
  void refetch()
}
</script>
