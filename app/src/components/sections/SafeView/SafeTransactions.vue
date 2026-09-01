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
      :is-empty="displayedTransactionRows.length === 0"
      :selected-status="selectedStatus"
      :empty-description="emptyStateDescription"
      @retry="refetchTransactions"
      @clear="clearFilter"
    />

    <template v-if="!isLoading && !error && displayedTransactionRows.length > 0">
      <SafeTransactionsTable
        :transactions="displayedTransactionRows"
        :actions-disabled="isApproving || isExecuting"
        @view="handleViewDetailsClick"
        @approve="handleApproveClick"
        @execute="handleExecuteClick"
      />

      <SafeTransactionMobileList
        :transactions="displayedTransactionRows"
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
      v-if="pendingConflictAction"
      :model-value="true"
      :is-executing="isExecuting || isApproving"
      :action="pendingConflictAction.action"
      @update:model-value="(isOpen) => !isOpen && handleCancelAction()"
      @confirm="handleConfirmAction"
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
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import TablePagination from '@/components/ui/TablePagination.vue'
import SafeTransactionsWarning from './SafeTransactionsWarning.vue'
import SafeTransactionDetailsModal from './SafeTransactionDetailsModal.vue'
import SafeTransactionStatusFilter from './SafeTransactionStatusFilter.vue'
import SafeTransactionMobileList from './SafeTransactionMobileList.vue'
import SafeTransactionFeedback from './SafeTransactionFeedback.vue'
import SafeTransactionsTable from './SafeTransactionsTable.vue'
import { usePagination } from '@/composables/usePagination'
import { useGetSafeTransactionsQuery, useGetSafeInfoQuery } from '@/queries/safe.queries'
import {
  useApproveTransactionMutation,
  useExecuteTransactionMutation
} from '@/queries/safe.mutations'
import { log } from '@/lib/logging'
import {
  getSafeTransactionFilterCounts,
  getSafeTransactionState,
  hasConflictingSafeTransactions,
  matchesSafeTransactionFilter,
  willSafeTransactionApprovalCauseConflict,
  buildSafeTransactionQueueRows,
  type SafeTransactionQueueRow,
  type SafeTransactionStateMeta,
  type SafeTransactionStatusFilter as SafeTransactionFilterValue
} from '@/utils/safe/transactionState'
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
const pendingConflictAction = ref<{
  action: 'approve' | 'execute'
  transaction: SafeTransaction
} | null>(null)

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

const chainId = useChainId()
const toast = useToast()
const { mutate: approve, isPending: isApproving } = useApproveTransactionMutation()
const { mutate: execute, isPending: isExecuting } = useExecuteTransactionMutation()
const approvingTransactions = ref<Set<string>>(new Set())
const executingTransactions = ref<Set<string>>(new Set())
const currentSafeNonce = computed(() => safeInfo.value?.nonce ?? 0)

const isConnectedUserOwner = computed(() => {
  if (!userDataStore.address || !safeInfo.value?.owners?.length) return false
  return safeInfo.value.owners.some(
    (owner) => owner.toLowerCase() === userDataStore.address?.toLowerCase()
  )
})

const getConflictContext = () => ({
  currentNonce: currentSafeNonce.value,
  threshold: safeInfo.value?.threshold,
  transactions: transactions.value ?? []
})

const getTransactionState = (transaction: SafeTransaction): SafeTransactionStateMeta =>
  getSafeTransactionState(transaction, {
    currentNonce: currentSafeNonce.value,
    threshold: safeInfo.value?.threshold,
    hasConflict: hasConflictingSafeTransactions(transaction, getConflictContext())
  })

const isTransactionLoading = (safeTxHash: string, action: 'approve' | 'execute'): boolean =>
  action === 'approve'
    ? approvingTransactions.value.has(safeTxHash) && isApproving.value
    : executingTransactions.value.has(safeTxHash) && isExecuting.value

const transactionRows = computed<SafeTransactionQueueRow[]>(() =>
  buildSafeTransactionQueueRows({
    ...getConflictContext(),
    isSigner: isConnectedUserOwner.value,
    connectedAddress: userDataStore.address,
    isTransactionLoading
  })
)

const filteredTransactionRows = computed(() =>
  transactionRows.value.filter((row) =>
    matchesSafeTransactionFilter(row.state.state, selectedStatus.value)
  )
)

const transactionCounts = computed(() =>
  getSafeTransactionFilterCounts(transactionRows.value.map((row) => row.state.state))
)

const total = computed(() => filteredTransactionRows.value.length)
const { page, pageSize, reset } = usePagination(() => total.value, { key: 'safeTx' })
const displayedTransactionRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredTransactionRows.value.slice(start, start + pageSize.value)
})

const emptyStateDescription = computed(() =>
  selectedStatus.value === 'all'
    ? 'Transfers and signer changes will appear here after they are proposed.'
    : selectedStatus.value === 'needs-action'
      ? 'Everything is complete for now. Review all transactions to see the Safe history.'
      : 'Choose another status to continue reviewing the Safe history.'
)

const getTransactionErrorMessage = (error: unknown, fallback: string): string => {
  const message = error instanceof Error ? error.message : fallback
  return message.includes('User rejected') ? 'Transaction rejected' : message
}

const approveTransaction = (transaction: SafeTransaction) => {
  approvingTransactions.value.add(transaction.safeTxHash)
  approve(
    {
      pathParams: {
        safeAddress: props.address,
        safeTxHash: transaction.safeTxHash
      },
      queryParams: {
        chainId: chainId.value
      }
    },
    {
      onSuccess: () => {
        toast.add({
          title: 'Success',
          description: 'Transaction approved successfully',
          color: 'success'
        })
      },
      onError: (error) => {
        log.error('Failed to approve transaction:', error)
        toast.add({
          title: 'Error',
          description: getTransactionErrorMessage(error, 'Failed to approve transaction'),
          color: 'error'
        })
      },
      onSettled: () => {
        approvingTransactions.value.delete(transaction.safeTxHash)
      }
    }
  )
}

const executeTransaction = (transaction: SafeTransaction) => {
  executingTransactions.value.add(transaction.safeTxHash)
  execute(
    {
      pathParams: {
        safeAddress: props.address,
        safeTxHash: transaction.safeTxHash
      },
      queryParams: {
        chainId: chainId.value
      },
      body: {
        transactionData: transaction
      }
    },
    {
      onSuccess: () => {
        toast.add({
          title: 'Success',
          description: 'Transaction executed successfully',
          color: 'success'
        })
      },
      onError: (error) => {
        log.error('Failed to execute transaction:', error)
        toast.add({
          title: 'Error',
          description: getTransactionErrorMessage(error, 'Failed to execute transaction'),
          color: 'error'
        })
      },
      onSettled: () => {
        executingTransactions.value.delete(transaction.safeTxHash)
      }
    }
  )
}

const handleApproveClick = (transaction: SafeTransaction) => {
  if (willSafeTransactionApprovalCauseConflict(transaction, getConflictContext())) {
    pendingConflictAction.value = { action: 'approve', transaction }
    return
  }

  approveTransaction(transaction)
}

const handleExecuteClick = (transaction: SafeTransaction) => {
  if (hasConflictingSafeTransactions(transaction, getConflictContext())) {
    pendingConflictAction.value = { action: 'execute', transaction }
    return
  }

  executeTransaction(transaction)
}

const handleConfirmAction = () => {
  const action = pendingConflictAction.value
  if (!action) return

  pendingConflictAction.value = null
  if (action.action === 'approve') approveTransaction(action.transaction)
  else executeTransaction(action.transaction)
}

const handleCancelAction = () => (pendingConflictAction.value = null)

watch(filteredTransactionRows, (transactionsList) => {
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
