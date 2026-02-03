<template>
  <CardComponent title="Transactions">
    <template #card-action>
      <div class="flex items-center gap-4">
        <SafeTransactionStatusFilter @statusChange="handleStatusChange" />
      </div>
    </template>

    <TableComponent
      :rows="filteredTransactions"
      :columns="[
        { key: 'method', label: 'Method' },
        { key: 'to', label: 'To' },
        { key: 'value', label: 'Value' },
        { key: 'status', label: 'Status' },
        { key: 'txHash', label: 'Tx Hash' },
        { key: 'actions', label: 'Actions' }
      ]"
      :loading="isLoading"
      :current-page-prop="currentPage"
      :items-per-page-prop="itemsPerPage"
      @update:currentPage="handlePageChange"
      @update:itemsPerPage="handleItemsPerPageChange"
      :maxItemsPerPage="5"
      data-test="safe-transactions-table"
    >
      <template #to-data="{ row }">
        <AddressToolTip :address="row.to" slice />
      </template>

      <template #value-data="{ row }">
        <span
          >{{ formatSafeTransactionValue(row.value.toString(), row?.dataDecoded, row.to) }}
        </span>
      </template>

      <template #status-data="{ row }">
        <span>{{ getTransactionStatus(row as SafeTransaction) }}</span>
        <span class="badge badge-sm flex items-center gap-1 badge-neutral badge-outline">
          {{ row.confirmations?.length || 0 }} / {{ row.confirmationsRequired }}
        </span>
      </template>

      <template #txHash-data="{ row }">
        <AddressToolTip
          v-if="row.transactionHash"
          :address="row.transactionHash"
          type="transaction"
          slice
        />
        <span v-else>...</span>
      </template>

      <template #method-data="{ row }">
        {{ row?.dataDecoded?.method || 'unknown' }}
      </template>

      <template #actions-data="{ row }">
        <div class="flex items-center gap-2">
          <ButtonUI
            size="xs"
            variant="primary"
            @click="handleApproveTransaction(row as SafeTransaction)"
            :disabled="!canApprove(row as SafeTransaction) || isApproving"
            :loading="isTransactionLoading(row.safeTxHash, 'approve')"
            class="flex items-center gap-1 text-xs"
            data-test="approve-button"
          >
            Approve
          </ButtonUI>

          <ButtonUI
            size="xs"
            variant="success"
            @click="handleExecuteClick(row as SafeTransaction)"
            :disabled="!canExecute(row as SafeTransaction) || isExecuting"
            :loading="isTransactionLoading(row.safeTxHash, 'execute')"
            class="flex items-center gap-1 text-xs"
            data-test="execute-button"
          >
            Execute
          </ButtonUI>
        </div>
      </template>
    </TableComponent>

    <!-- Conflicting Transaction Warning Modal -->
    <SafeTransactionsWarning
      v-if="showConflictWarning"
      v-model="showConflictWarning"
      :is-executing="isExecuting"
      @confirm="handleConfirmExecution"
      @cancel="handleCancelExecution"
      data-test="conflict-warning-modal"
    />
  </CardComponent>
</template>

<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { useAccount } from '@wagmi/vue'
import type { SafeTransaction } from '@/types/safe'

// Components
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import SafeTransactionsWarning from './SafeTransactionsWarning.vue'

// Stores and composables
import { useSafeTransactionsQuery, useSafeInfoQuery } from '@/queries/safe.queries'
import { useSafeApproval, useSafeExecution } from '@/composables/safe'
import SafeTransactionStatusFilter, {
  type SafeTransactionStatus
} from '@/components/sections/SafeView/SafeTransactionStatusFilter.vue'
import { type Address } from 'viem'

import { formatSafeTransactionValue } from '@/utils'

const { address: connectedAddress } = useAccount()

interface Props {
  address: Address
}

const props = defineProps<Props>()

// Status filtering
const selectedStatus = ref<SafeTransactionStatus>('all')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(5)

// Conflict warning state
const showConflictWarning = ref(false)
const pendingExecutionTransaction = ref<SafeTransaction | null>(null)

// Data fetching
const {
  data: transactions,
  isLoading,
  error
} = useSafeTransactionsQuery(computed(() => props.address))

const { data: safeInfo } = useSafeInfoQuery(computed(() => props.address))

// Safe operations
const { approveTransaction, isApproving } = useSafeApproval()
const { executeTransaction, isExecuting } = useSafeExecution()

// Computed values
const isConnectedUserOwner = computed(() => {
  if (!connectedAddress.value || !safeInfo.value?.owners?.length) return false

  return safeInfo.value.owners.some(
    (owner) => owner.toLowerCase() === connectedAddress.value!.toLowerCase()
  )
})

// Get current Safe nonce
const currentSafeNonce = computed(() => safeInfo.value?.nonce ?? 0)

// Check if transaction nonce is valid
const isTransactionNonceValid = (transaction: SafeTransaction): boolean => {
  return transaction.nonce >= currentSafeNonce.value
}

// Check if executing this transaction would conflict with others
const hasConflictingTransactions = (transaction: SafeTransaction): boolean => {
  if (!transactions.value) return false

  // Check if there are any other pending transactions with nonce >= current Safe nonce
  return transactions.value.some(
    (tx) =>
      !tx.isExecuted &&
      tx.safeTxHash !== transaction.safeTxHash &&
      tx.nonce >= currentSafeNonce.value
  )
}

// Simplified filtering - directly filter the original transactions
const filteredTransactions = computed(() => {
  if (!transactions.value) return []

  switch (selectedStatus.value) {
    case 'pending':
      return transactions.value.filter((tx) => !tx.isExecuted)
    case 'executed':
      return transactions.value.filter((tx) => tx.isExecuted)
    default:
      return transactions.value
  }
})

// Reset pagination when filter changes
watch(selectedStatus, () => {
  currentPage.value = 1
})

// Reset pagination when filtered data changes significantly
watch(
  filteredTransactions,
  (newTransactions, oldTransactions) => {
    // Reset to page 1 if current page would be empty
    if (newTransactions && oldTransactions) {
      const totalPages = Math.ceil(newTransactions.length / itemsPerPage.value)
      if (currentPage.value > totalPages && totalPages > 0) {
        currentPage.value = 1
      }
    }
  },
  { deep: false }
)

// Helper functions
const getTransactionStatus = (transaction: SafeTransaction): string => {
  if (transaction.isExecuted) return 'Executed'

  // Check if transaction nonce is invalid
  if (!isTransactionNonceValid(transaction)) {
    return 'Invalid (Stale Nonce)'
  }

  const confirmations = transaction.confirmations?.length || 0
  const required = transaction.confirmationsRequired || safeInfo.value?.threshold || 0

  if (confirmations >= required) return 'Ready to Execute'
  return 'Pending'
}

const approvingTransactions = ref<Set<string>>(new Set())
const executingTransactions = ref<Set<string>>(new Set())

const isTransactionLoading = (safeTxHash: string, operation: 'approve' | 'execute'): boolean => {
  if (operation === 'approve') {
    return approvingTransactions.value.has(safeTxHash) && isApproving.value
  } else {
    return executingTransactions.value.has(safeTxHash) && isExecuting.value
  }
}

const canApprove = (transaction: SafeTransaction): boolean => {
  if (!isConnectedUserOwner.value) return false
  if (!props.address) return false
  if (transaction.isExecuted) return false

  // Don't allow approving transactions with invalid nonce
  if (!isTransactionNonceValid(transaction)) return false

  const userAlreadyConfirmed = transaction.confirmations?.some(
    (confirmation) => confirmation.owner.toLowerCase() === connectedAddress.value?.toLowerCase()
  )

  return !userAlreadyConfirmed
}

const canExecute = (transaction: SafeTransaction): boolean => {
  if (!isConnectedUserOwner.value) return false
  if (transaction.isExecuted) return false

  // Don't allow executing transactions with invalid nonce
  if (!isTransactionNonceValid(transaction)) return false

  const confirmations = transaction.confirmations?.length || 0
  const required = transaction.confirmationsRequired || safeInfo.value?.threshold || 0

  return confirmations >= required
}

// Event handlers
const handleApproveTransaction = async (transaction: SafeTransaction) => {
  const safeAddress = props.address
  if (!safeAddress) return
  approvingTransactions.value.add(transaction.safeTxHash)
  await approveTransaction(safeAddress, transaction.safeTxHash)
  approvingTransactions.value.delete(transaction.safeTxHash)
}

const handleExecuteClick = (transaction: SafeTransaction) => {
  // Check for conflicting transactions
  if (hasConflictingTransactions(transaction)) {
    pendingExecutionTransaction.value = transaction
    showConflictWarning.value = true
  } else {
    // No conflicts, execute directly
    handleExecuteTransaction(transaction)
  }
}

const handleConfirmExecution = async () => {
  if (pendingExecutionTransaction.value) {
    await handleExecuteTransaction(pendingExecutionTransaction.value)
    showConflictWarning.value = false
    pendingExecutionTransaction.value = null
  }
}

const handleCancelExecution = () => {
  pendingExecutionTransaction.value = null
  showConflictWarning.value = false
}

const handleExecuteTransaction = async (transaction: SafeTransaction) => {
  const safeAddress = props.address
  if (!safeAddress) return
  executingTransactions.value.add(transaction.safeTxHash)
  await executeTransaction(safeAddress, transaction.safeTxHash, transaction)
  executingTransactions.value.delete(transaction.safeTxHash)
}

const handleStatusChange = (status: SafeTransactionStatus) => {
  selectedStatus.value = status
}

// Handle pagination updates
const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handleItemsPerPageChange = (items: number) => {
  itemsPerPage.value = items
  currentPage.value = 1 // Reset to first page when changing items per page
}

// Error watching
watch(error, (newError) => {
  if (newError) {
    console.error('Error loading safe transactions:', newError)
  }
})
</script>
