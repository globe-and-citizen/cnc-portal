<template>
  <UCard data-test="safe-transactions-card">
    <template #header>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">Approval queue</p>
          <p class="mt-1 text-sm text-gray-500">
            Review what the Safe will do, collect signer approvals, then execute ready actions.
          </p>
        </div>
        <SafeTransactionStatusFilter v-model="selectedStatus" @status-change="handleStatusChange" />
      </div>
    </template>

    <SafeTransactionSummary :counts="transactionCounts" />

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
          <template #to-cell="{ row: { original: row } }">
            <UserComponent :user="resolveUser(row.to)" />
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

          <template #status-cell="{ row: { original: row } }">
            <div class="min-w-40 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="getTransactionState(row).color"
                  variant="soft"
                  size="sm"
                  data-test="safe-transaction-state"
                >
                  {{ getTransactionState(row).label }}
                </UBadge>
                <span class="text-xs text-gray-500">
                  {{ row.confirmations?.length || 0 }} / {{ requiredConfirmations(row) }} approvals
                </span>
              </div>
              <p class="text-xs text-gray-500">{{ getTransactionState(row).nextStep }}</p>
            </div>
          </template>

          <template #txHash-cell="{ row: { original: row } }">
            <AddressToolTip
              v-if="row.transactionHash"
              :address="row.transactionHash"
              type="transaction"
              slice
            />
            <span v-else class="text-gray-400">Not executed</span>
          </template>

          <template #method-cell="{ row: { original: row } }">
            {{ getSafeTransactionMethod(row) }}
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

    <template #footer>
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
import UserComponent from '@/components/UserComponent.vue'
import SafeTransactionsWarning from './SafeTransactionsWarning.vue'
import SafeTransactionDetailsModal from './SafeTransactionDetailsModal.vue'
import SafeTransactionActions from './SafeTransactionActions.vue'
import SafeTransactionStatusFilter from './SafeTransactionStatusFilter.vue'
import SafeTransactionSummary from './SafeTransactionSummary.vue'
import SafeTransactionMobileList from './SafeTransactionMobileList.vue'
import SafeTransactionFeedback from './SafeTransactionFeedback.vue'
import { usePagination } from '@/composables/usePagination'
import { useGetSafeTransactionsQuery, useGetSafeInfoQuery } from '@/queries/safe.queries'
import { useSafeTransactionConflicts } from '@/composables/safe/useSafeTransactionConflicts'
import { useSafeTransactionActions } from '@/composables/safe/useSafeTransactionActions'
import { formatSafeTransactionValue, getSafeTransactionMethod, resolveUser, log } from '@/utils'
import {
  getSafeTransactionPermissions,
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
const selectedStatus = ref<SafeTransactionFilterValue>('all')
const showDetailsModal = ref(false)
const selectedTransactionForDetails = ref<SafeTransaction | null>(null)

const columns: TableColumn<SafeTransaction>[] = [
  { accessorKey: 'method', header: 'Action' },
  { accessorKey: 'to', header: 'Recipient' },
  { accessorKey: 'value', header: 'Value' },
  { accessorKey: 'status', header: 'Status and next step' },
  { accessorKey: 'txHash', header: 'On-chain transaction' },
  { accessorKey: 'actions', header: 'Available actions' }
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

const transactionCounts = computed(() => {
  const counts = { pending: 0, ready: 0, conflicting: 0, executed: 0 }
  for (const transaction of transactions.value ?? []) {
    const state = getTransactionState(transaction).state
    if (state in counts) counts[state as keyof typeof counts] += 1
  }
  return counts
})

const total = computed(() => filteredTransactions.value.length)
const { page, pageSize, reset } = usePagination(() => total.value, { key: 'safeTx' })
const displayedTransactions = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredTransactions.value.slice(start, start + pageSize.value)
})

const emptyStateDescription = computed(() =>
  selectedStatus.value === 'all'
    ? 'Transfers and signer changes will appear here after they are proposed.'
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
