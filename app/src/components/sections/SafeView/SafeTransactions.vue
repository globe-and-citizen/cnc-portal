<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span>Transactions</span>
        <div class="flex items-center gap-4">
          <SafeTransactionStatusFilter @statusChange="handleStatusChange" />
        </div>
      </div>
    </template>

    <UTable
      :data="displayedTransactions"
      :columns="[
        { accessorKey: 'method', header: 'Method' },
        { accessorKey: 'to', header: 'To' },
        { accessorKey: 'value', header: 'Value' },
        { accessorKey: 'status', header: 'Status' },
        { accessorKey: 'txHash', header: 'Tx Hash' },
        { accessorKey: 'actions', header: 'Actions' }
      ]"
      :loading="isLoading"
      data-test="safe-transactions-table"
    >
      <template #to-cell="{ row: { original: row } }">
        <UserComponent :user="resolveUser(row.to)" />
      </template>

      <template #value-cell="{ row: { original: row } }">
        <span
          >{{
            formatSafeTransactionValue(row.value.toString(), row.dataDecoded ?? undefined, row.to)
          }}
        </span>
      </template>

      <template #status-cell="{ row: { original: row } }">
        <span>{{ getTransactionStatus(row as SafeTransaction) }}</span>
        <UBadge color="neutral" variant="outline" size="sm" class="flex items-center gap-1">
          {{ row.confirmations?.length || 0 }} / {{ row.confirmationsRequired }}
        </UBadge>
      </template>

      <template #txHash-cell="{ row: { original: row } }">
        <AddressToolTip
          v-if="row.transactionHash"
          :address="row.transactionHash"
          type="transaction"
          slice
        />
        <span v-else>...</span>
      </template>

      <template #method-cell="{ row: { original: row } }">
        {{ getSafeTransactionMethod(row as SafeTransaction) }}
      </template>

      <template #actions-cell="{ row: { original: row } }">
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="heroicons:eye"
            @click="handleViewDetailsClick(row as SafeTransaction)"
            data-test="view-details-button"
          />

          <UButton
            size="xs"
            color="primary"
            @click="handleApproveClick(row as SafeTransaction)"
            :disabled="!canApprove(row as SafeTransaction) || isApproving"
            :loading="isTransactionLoading(row.safeTxHash, 'approve')"
            class="flex items-center gap-1 text-xs"
            data-test="approve-button"
          >
            Approve
          </UButton>

          <UButton
            size="xs"
            color="success"
            @click="handleExecuteClick(row as SafeTransaction)"
            :disabled="!canExecute(row as SafeTransaction) || isExecuting"
            :loading="isTransactionLoading(row.safeTxHash, 'execute')"
            class="flex items-center gap-1 text-xs"
            data-test="execute-button"
          >
            Execute
          </UButton>
        </div>
      </template>
    </UTable>

    <!-- Conflicting Transaction Warning Modal -->
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
    />
  </UCard>
</template>

<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import { usePagination } from '@/composables/usePagination'
import type { SafeTransaction } from '@/types/safe'

// Components
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import UserComponent from '@/components/ui/UserComponent.vue'
import SafeTransactionsWarning from './SafeTransactionsWarning.vue'
import SafeTransactionDetailsModal from './SafeTransactionDetailsModal.vue'

// Stores and composables
import { useGetSafeTransactionsQuery, useGetSafeInfoQuery } from '@/queries/safe.queries'
import { useSafeTransactionConflicts } from '@/composables/safe/useSafeTransactionConflicts'
import { useSafeTransactionActions } from '@/composables/safe/useSafeTransactionActions'
import SafeTransactionStatusFilter, {
  type SafeTransactionStatus
} from '@/components/sections/SafeView/SafeTransactionStatusFilter.vue'
import { type Address } from 'viem'

import { formatSafeTransactionValue, getSafeTransactionMethod, resolveUser, log } from '@/utils'
import { useUserDataStore } from '@/stores'

const userDataStore = useUserDataStore()

interface Props {
  address: Address
}

const props = defineProps<Props>()

// Status filtering
const selectedStatus = ref<SafeTransactionStatus>('all')

// Route-bound page + size (shareable, reload-safe) with resize anchoring.
const { page, pageSize, reset } = usePagination(() => total.value, { key: 'safeTx' })

const showDetailsModal = ref(false)
const selectedTransactionForDetails = ref<SafeTransaction | null>(null)

// Data fetching
const {
  data: transactions,
  isLoading,
  error
} = useGetSafeTransactionsQuery({ pathParams: { safeAddress: computed(() => props.address) } })

const { data: safeInfo } = useGetSafeInfoQuery({
  pathParams: { safeAddress: computed(() => props.address) }
})

// Transaction conflict detection - now only needs safeAddress!
const { isTransactionNonceValid, hasConflictingTransactions, willApprovalCauseConflict } =
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

// Computed values
const isConnectedUserOwner = computed(() => {
  if (!userDataStore.address || !safeInfo.value?.owners?.length) return false

  return safeInfo.value.owners.some(
    (owner) => owner.toLowerCase() === userDataStore.address.toLowerCase()
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

// Helper functions
const getTransactionStatus = (transaction: SafeTransaction): string => {
  if (transaction.isExecuted) return 'Executed'

  // Check if transaction nonce is invalid (stale)
  if (!isTransactionNonceValid(transaction)) {
    return 'Invalid (Stale Nonce)'
  }

  const confirmations = transaction.confirmations?.length || 0
  const required = transaction.confirmationsRequired || safeInfo.value?.threshold || 0

  if (confirmations >= required) return 'Ready to Execute'
  return 'Pending'
}

/**
 * Determine if a transaction can be approved
 * Prevents approving:
 * - Already executed transactions
 * - Transactions with stale nonces (nonce < current Safe nonce)
 * - Transactions already approved by the current user
 */
const canApprove = (transaction: SafeTransaction): boolean => {
  if (!isConnectedUserOwner.value) return false
  if (!props.address) return false
  if (transaction.isExecuted) return false

  // Don't allow approving transactions with invalid/stale nonce
  // These can never be executed on-chain
  if (!isTransactionNonceValid(transaction)) return false

  const userAlreadyConfirmed = transaction.confirmations?.some(
    (confirmation) => confirmation.owner.toLowerCase() === userDataStore.address?.toLowerCase()
  )

  return !userAlreadyConfirmed
}

/**
 * Determine if a transaction can be executed
 * Prevents executing:
 * - Already executed transactions
 * - Transactions with stale nonces
 * - Transactions without enough confirmations
 */
const canExecute = (transaction: SafeTransaction): boolean => {
  if (!isConnectedUserOwner.value) return false
  if (transaction.isExecuted) return false

  // Don't allow executing transactions with invalid/stale nonce
  if (!isTransactionNonceValid(transaction)) return false

  const confirmations = transaction.confirmations?.length || 0
  const required = transaction.confirmationsRequired || safeInfo.value?.threshold || 0

  return confirmations >= required
}

const total = computed(() => filteredTransactions.value.length)
const displayedTransactions = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredTransactions.value.slice(start, start + pageSize.value)
})

// Page-size changes are handled by usePagination's resize anchoring, so no
// pageSize watcher here. Still clamp the page when a status filter shrinks the
// list below the current page.
watch(filteredTransactions, (transactionsList) => {
  const maxPage = Math.max(1, Math.ceil(transactionsList.length / pageSize.value))
  if (page.value > maxPage) {
    page.value = maxPage
  }
})

const handleStatusChange = (status: SafeTransactionStatus) => {
  selectedStatus.value = status
  reset()
}

const handleViewDetailsClick = (transaction: SafeTransaction) => {
  selectedTransactionForDetails.value = transaction
  showDetailsModal.value = true
}

watch(showDetailsModal, (isOpen) => {
  if (!isOpen) selectedTransactionForDetails.value = null
})

// Error watching
watch(error, (newError) => {
  if (newError) {
    log.error('Error loading safe transactions:', newError)
  }
})
</script>
