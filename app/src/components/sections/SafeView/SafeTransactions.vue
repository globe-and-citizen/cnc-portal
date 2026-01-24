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
        <span>{{ formatValue(row.value.toString()) }} </span>
      </template>

      <template #status-data="{ row }">
        <span>{{ getTransactionStatus(row as SafeTransaction) }}</span>
        <span class="badge badge-sm flex items-center gap-1 badge-neutral badge-outline">
          {{ row.confirmations?.length || 0 }} / {{ row.confirmationsRequired }}
        </span>
      </template>

      <template #txHash-data="{ row }">
        <AddressToolTip :address="row.safeTxHash" type="transaction" slice />
        <a
          :href="getTransactionExplorerUrl(row as SafeTransaction)"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:text-primary-focus transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': !row.transactionHash }"
          data-test="explorer-link"
        >
          <IconifyIcon
            icon="heroicons-outline:external-link"
            class="w-4 h-4"
            :title="row.transactionHash ? 'View on block explorer' : 'Not yet executed'"
          />
        </a>
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
            @click="handleExecuteTransaction(row as SafeTransaction)"
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
  </CardComponent>
</template>

<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { useAccount } from '@wagmi/vue'
import type { SafeTransaction } from '@/types/safe'
import { formatCurrencyShort } from '@/utils'
// Components
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { Icon as IconifyIcon } from '@iconify/vue'

// Stores and composables
import { useTeamStore } from '@/stores'
import { useSafeTransactionsQuery, useSafeInfoQuery } from '@/queries/safe.queries'
import { useSafeApproval, useSafeExecution } from '@/composables/safe'
import SafeTransactionStatusFilter, {
  type SafeTransactionStatus
} from '@/components/sections/SafeView/SafeTransactionStatusFilter.vue'
import { NETWORK } from '@/constant'
import { formatEther } from 'viem'

const teamStore = useTeamStore()
const { address: connectedAddress } = useAccount()

// Status filtering
const selectedStatus = ref<SafeTransactionStatus>('all')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(5)

// Data fetching
const {
  data: transactions,
  isLoading,
  error
} = useSafeTransactionsQuery(computed(() => teamStore.currentTeamMeta?.data?.safeAddress))

const { data: safeInfo } = useSafeInfoQuery(
  computed(() => teamStore.currentTeamMeta?.data?.safeAddress)
)

const formatValue = (value: string): string => {
  try {
    const etherValue = formatEther(BigInt(value))
    const numericValue = parseFloat(etherValue)
    return `${numericValue.toFixed(4)} ${NETWORK.currencySymbol}`
  } catch {
    return `0 ${NETWORK.currencySymbol}`
  }
}
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

const getTransactionExplorerUrl = (transaction: SafeTransaction): string => {
  if (transaction.safeTxHash) {
    return `${NETWORK.blockExplorerUrl}/tx/${transaction.transactionHash}`
  }
  // If not executed yet, show the Safe transaction service URL or disable link
  return '#'
}

const canApprove = (transaction: SafeTransaction): boolean => {
  if (!isConnectedUserOwner.value) return false
  if (!teamStore.currentTeamMeta?.data?.safeAddress) return false
  if (transaction.isExecuted) return false

  const userAlreadyConfirmed = transaction.confirmations?.some(
    (confirmation) => confirmation.owner.toLowerCase() === connectedAddress.value?.toLowerCase()
  )

  return !userAlreadyConfirmed
}

const canExecute = (transaction: SafeTransaction): boolean => {
  if (!isConnectedUserOwner.value) return false
  if (transaction.isExecuted) return false

  const confirmations = transaction.confirmations?.length || 0
  const required = transaction.confirmationsRequired || safeInfo.value?.threshold || 0

  return confirmations >= required
}

// Event handlers
const handleApproveTransaction = async (transaction: SafeTransaction) => {
  const safeAddress = teamStore.currentTeamMeta?.data?.safeAddress
  if (!safeAddress) return
  approvingTransactions.value.add(transaction.safeTxHash)
  await approveTransaction(safeAddress, transaction.safeTxHash)
}

const handleExecuteTransaction = async (transaction: SafeTransaction) => {
  const safeAddress = teamStore.currentTeamMeta?.data?.safeAddress
  if (!safeAddress) return
  executingTransactions.value.add(transaction.safeTxHash)
  await executeTransaction(safeAddress, transaction.safeTxHash, transaction)
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

// Debug transaction changes
watch(
  transactions,
  (newTransactions) => {
    console.log('Safe transactions updated:', {
      count: newTransactions?.length || 0,
      transactions: newTransactions
    })
  },
  { immediate: true }
)
</script>
