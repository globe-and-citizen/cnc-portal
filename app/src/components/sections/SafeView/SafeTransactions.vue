<template>
  <UCard data-test="safe-transactions-card">
    <template #header>
      <div class="space-y-4">
        <div>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">Approval queue</p>
          <p class="mt-1 text-sm text-gray-500">
            Start with transactions that need signer action, then review the completed history.
          </p>
        </div>
        <SafeTransactionStatusFilter
          v-model="selectedStatus"
          :counts="transactionCounts"
          @status-change="handleStatusChange"
        />
      </div>
    </template>

    <SafeTransactionFeedback
      :has-error="!!error"
      :is-loading="isLoading"
      :is-empty="displayedTransactions.length === 0"
      :selected-status="selectedStatus"
      :empty-description="emptyStateDescription"
      @retry="refetchTransactions"
      @clear="clearFilter"
    />

    <template v-if="!isLoading && !error && displayedTransactions.length > 0">
      <div class="hidden overflow-x-auto md:block">
        <UTable
          :data="displayedTransactions"
          :columns="columns"
          data-test="safe-transactions-table"
        >
          <template #transaction-cell="{ row: { original: row } }">
            <div class="min-w-44">
              <p class="font-medium capitalize">{{ getSafeTransactionMethod(row) }}</p>
              <div class="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <span>To</span>
                <AddressToolTip :address="row.to" slice />
              </div>
            </div>
          </template>

          <template #value-cell="{ row: { original: row } }">
            <span>
              {{
                formatSafeTransactionValue(
                  row.value.toString(),
                  row.dataDecoded ?? undefined,
                  row.to
                )
              }}
            </span>
          </template>

          <template #approvals-cell="{ row: { original: row } }">
            <div class="min-w-28" data-test="safe-transaction-approval-progress">
              <p class="text-sm font-medium">
                {{ row.confirmations?.length || 0 }} of {{ requiredConfirmations(row) }}
              </p>
              <div
                class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                role="progressbar"
                :aria-label="`Transaction approval progress: ${row.confirmations?.length || 0} of ${requiredConfirmations(row)}`"
                :aria-valuenow="row.confirmations?.length || 0"
                aria-valuemin="0"
                :aria-valuemax="requiredConfirmations(row)"
              >
                <div
                  class="bg-primary h-full rounded-full"
                  :style="{ width: confirmationProgress(row) }"
                />
              </div>
            </div>
          </template>

          <template #status-cell="{ row: { original: row } }">
            <div class="max-w-52 space-y-1.5">
              <UBadge
                :color="getTransactionState(row).color"
                variant="soft"
                size="sm"
                data-test="safe-transaction-state"
              >
                {{ getTransactionState(row).label }}
              </UBadge>
              <p class="text-xs text-gray-500">{{ getTransactionState(row).nextStep }}</p>
            </div>
          </template>

          <template #updated-cell="{ row: { original: row } }">
            <span class="text-sm whitespace-nowrap text-gray-500">
              {{ formatDateRelative(row.modified) }}
            </span>
          </template>

          <template #actions-cell="{ row: { original: row } }">
            <SafeTransactionActions
              v-bind="getTransactionPermissions(row)"
              :is-approving="isTransactionLoading(row.safeTxHash, 'approve')"
              :is-executing="isTransactionLoading(row.safeTxHash, 'execute')"
              :actions-disabled="isApproving || isExecuting"
              @view="handleViewDetailsClick(row)"
              @approve="handleApproveClick(row)"
              @execute="handleExecuteClick(row)"
            />
          </template>
        </UTable>
      </div>

      <SafeTransactionMobileList
        :transactions="displayedTransactions"
        :get-state="getTransactionState"
        :get-permissions="getTransactionPermissions"
        :required-confirmations="requiredConfirmations"
        :confirmation-progress="confirmationProgress"
        :is-transaction-loading="isTransactionLoading"
        :actions-disabled="isApproving || isExecuting"
        @view="handleViewDetailsClick"
        @approve="handleApproveClick"
        @execute="handleExecuteClick"
      />
    </template>

    <template v-if="!isLoading && !error && total > pageSize" #footer>
      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        noun="transactions"
        data-test-prefix="safe-transaction"
      />
    </template>

    <SafeTransactionsWarning
      v-if="showConflictWarning"
      v-model="showConflictWarning"
      :is-executing="isExecuting || isApproving"
      :action="conflictActionLabel"
      @confirm="handleConfirmAction"
      @cancel="handleCancelAction"
      data-test="conflict-warning-modal"
    />

    <SafeTransactionDetailsModal
      v-model="showDetailsModal"
      :transaction="selectedTransactionForDetails"
      :state="
        selectedTransactionForDetails
          ? getTransactionState(selectedTransactionForDetails)
          : undefined
      "
    />
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Address } from 'viem'
import TablePagination from '@/components/TablePagination.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import SafeTransactionsWarning from './SafeTransactionsWarning.vue'
import SafeTransactionDetailsModal from './SafeTransactionDetailsModal.vue'
import SafeTransactionActions from './SafeTransactionActions.vue'
import SafeTransactionStatusFilter from './SafeTransactionStatusFilter.vue'
import SafeTransactionMobileList from './SafeTransactionMobileList.vue'
import SafeTransactionFeedback from './SafeTransactionFeedback.vue'
import { usePagination } from '@/composables/usePagination'
import { useGetSafeTransactionsQuery, useGetSafeInfoQuery } from '@/queries/safe.queries'
import { useSafeTransactionConflicts } from '@/composables/safe/useSafeTransactionConflicts'
import { useSafeTransactionActions } from '@/composables/safe/useSafeTransactionActions'
import { formatSafeTransactionValue, getSafeTransactionMethod, log } from '@/utils'
import { formatDateRelative } from '@/utils/format'
import {
  getSafeTransactionPermissions,
  getSafeTransactionFilterCounts,
  getSafeTransactionState,
  matchesSafeTransactionFilter,
  type SafeTransactionStateMeta,
  type SafeTransactionStatusFilter as SafeTransactionFilterValue
} from '@/utils/safeTransactionState'
import type { SafeTransaction } from '@/types/safe'
import { useUserDataStore } from '@/stores'

interface Props {
  address: Address
}

const props = defineProps<Props>()
const userDataStore = useUserDataStore()
const selectedStatus = ref<SafeTransactionFilterValue>('needs-action')
const showDetailsModal = ref(false)
const selectedTransactionForDetails = ref<SafeTransaction | null>(null)

const columns: TableColumn<SafeTransaction>[] = [
  { accessorKey: 'transaction', header: 'Transaction' },
  { accessorKey: 'value', header: 'Value' },
  { accessorKey: 'approvals', header: 'Approvals' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'updated', header: 'Updated' },
  { accessorKey: 'actions', header: 'Action' }
]

const {
  data: transactions,
  isLoading,
  error,
  refetch: refetchTransactions
} = useGetSafeTransactionsQuery({
  pathParams: { safeAddress: computed(() => props.address) }
})

const { data: safeInfo } = useGetSafeInfoQuery({
  pathParams: { safeAddress: computed(() => props.address) }
})

const { currentSafeNonce, hasConflictingTransactions, willApprovalCauseConflict } =
  useSafeTransactionConflicts(computed(() => props.address))

const {
  isApproving,
  isExecuting,
  showConflictWarning,
  conflictActionLabel,
  isTransactionLoading,
  handleApproveClick,
  handleExecuteClick,
  handleConfirmAction,
  handleCancelAction
} = useSafeTransactionActions({
  safeAddress: computed(() => props.address),
  hasConflictingTransactions,
  willApprovalCauseConflict
})

const isConnectedUserOwner = computed(() => {
  if (!userDataStore.address || !safeInfo.value?.owners?.length) return false
  return safeInfo.value.owners.some(
    (owner) => owner.toLowerCase() === userDataStore.address?.toLowerCase()
  )
})

const requiredConfirmations = (transaction: SafeTransaction) =>
  transaction.confirmationsRequired || safeInfo.value?.threshold || 0

const getTransactionState = (transaction: SafeTransaction): SafeTransactionStateMeta =>
  getSafeTransactionState(transaction, {
    currentNonce: currentSafeNonce.value,
    threshold: safeInfo.value?.threshold,
    hasConflict: hasConflictingTransactions(transaction)
  })

const getTransactionPermissions = (transaction: SafeTransaction) =>
  getSafeTransactionPermissions(transaction, {
    state: getTransactionState(transaction).state,
    isSigner: isConnectedUserOwner.value,
    connectedAddress: userDataStore.address,
    threshold: safeInfo.value?.threshold
  })

const filteredTransactions = computed(() =>
  (transactions.value ?? []).filter((transaction) =>
    matchesSafeTransactionFilter(getTransactionState(transaction).state, selectedStatus.value)
  )
)

const transactionCounts = computed(() =>
  getSafeTransactionFilterCounts(
    (transactions.value ?? []).map((transaction) => getTransactionState(transaction).state)
  )
)

const total = computed(() => filteredTransactions.value.length)
const { page, pageSize, reset } = usePagination(() => total.value, { key: 'safeTx' })
const displayedTransactions = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredTransactions.value.slice(start, start + pageSize.value)
})

const emptyStateDescription = computed(() =>
  selectedStatus.value === 'all'
    ? 'Transfers and signer changes will appear here after they are proposed.'
    : selectedStatus.value === 'needs-action'
      ? 'Everything is complete for now. Review all transactions to see the Safe history.'
      : 'Choose another status to continue reviewing the Safe history.'
)

const confirmationProgress = (transaction: SafeTransaction) => {
  const required = requiredConfirmations(transaction)
  if (required <= 0) return '0%'
  return `${Math.min(((transaction.confirmations?.length || 0) / required) * 100, 100)}%`
}

watch(filteredTransactions, (transactionsList) => {
  const maxPage = Math.max(1, Math.ceil(transactionsList.length / pageSize.value))
  if (page.value > maxPage) page.value = maxPage
})

const handleStatusChange = () => reset()

const clearFilter = () => {
  selectedStatus.value = 'all'
  reset()
}

const handleViewDetailsClick = (transaction: SafeTransaction) => {
  selectedTransactionForDetails.value = transaction
  showDetailsModal.value = true
}

watch(showDetailsModal, (isOpen) => {
  if (!isOpen) selectedTransactionForDetails.value = null
})

watch(error, (newError) => {
  if (newError) log.error('Error loading Safe transactions:', newError)
})
</script>
