<template>
  <div class="hidden overflow-x-auto md:block">
    <UTable :data="transactions" :columns="columns" data-test="safe-transactions-table">
      <template #transaction-cell="{ row: { original: row } }">
        <div class="min-w-44">
          <p class="font-medium capitalize">{{ getSafeTransactionMethod(row.transaction) }}</p>
          <div class="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <span>To</span>
            <AddressTooltip :address="row.transaction.to" slice />
          </div>
        </div>
      </template>

      <template #value-cell="{ row: { original: row } }">
        <span>
          {{
            formatSafeTransactionValue(
              row.transaction.value.toString(),
              row.transaction.dataDecoded ?? undefined,
              row.transaction.to
            )
          }}
        </span>
      </template>

      <template #approvals-cell="{ row: { original: row } }">
        <div class="min-w-28" data-test="safe-transaction-approval-progress">
          <p class="text-sm font-medium">
            {{ row.transaction.confirmations?.length || 0 }} of {{ row.requiredConfirmations }}
          </p>
          <div
            class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            role="progressbar"
            :aria-label="`Transaction approval progress: ${row.transaction.confirmations?.length || 0} of ${row.requiredConfirmations}`"
            :aria-valuenow="row.transaction.confirmations?.length || 0"
            aria-valuemin="0"
            :aria-valuemax="row.requiredConfirmations"
          >
            <div
              class="bg-primary h-full rounded-full"
              :style="{ width: row.confirmationProgress }"
            />
          </div>
        </div>
      </template>

      <template #status-cell="{ row: { original: row } }">
        <div class="max-w-52 space-y-1.5">
          <UBadge
            :color="row.state.color"
            variant="soft"
            size="sm"
            data-test="safe-transaction-state"
          >
            {{ row.state.label }}
          </UBadge>
          <p class="text-xs text-gray-500">{{ row.state.nextStep }}</p>
        </div>
      </template>

      <template #updated-cell="{ row: { original: row } }">
        <span class="text-sm whitespace-nowrap text-gray-500">
          {{ formatDateRelative(row.transaction.modified) }}
        </span>
      </template>

      <template #actions-cell="{ row: { original: row } }">
        <SafeTransactionActions
          v-bind="row.permissions"
          :is-approving="row.isApproving"
          :is-executing="row.isExecuting"
          :actions-disabled="actionsDisabled"
          @view="emit('view', row.transaction)"
          @approve="emit('approve', row.transaction)"
          @execute="emit('execute', row.transaction)"
        />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import type { SafeTransaction } from '@/types/safe'
import { type SafeTransactionQueueRow } from '@/utils/safeTransactionState'
import { formatSafeTransactionValue, getSafeTransactionMethod } from '@/utils'
import { formatDateRelative } from '@/utils/format'
import SafeTransactionActions from './SafeTransactionActions.vue'

interface Props {
  transactions: SafeTransactionQueueRow[]
  actionsDisabled?: boolean
}

withDefaults(defineProps<Props>(), { actionsDisabled: false })

const emit = defineEmits<{
  view: [transaction: SafeTransaction]
  approve: [transaction: SafeTransaction]
  execute: [transaction: SafeTransaction]
}>()

const columns: TableColumn<SafeTransactionQueueRow>[] = [
  { accessorKey: 'transaction', header: 'Transaction' },
  { accessorKey: 'value', header: 'Value' },
  { accessorKey: 'approvals', header: 'Approvals' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'updated', header: 'Updated' },
  { accessorKey: 'actions', header: 'Action' }
]
</script>
