<template>
  <div
    v-if="hasError"
    class="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/30"
    role="alert"
    data-test="safe-transactions-error"
  >
    <div class="flex min-w-0 items-start gap-3">
      <UIcon name="i-lucide-circle-alert" class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div>
        <p class="text-sm font-medium text-red-800 dark:text-red-200">Approval queue unavailable</p>
        <p class="mt-0.5 text-sm text-red-700 dark:text-red-300">
          Check your connection and try loading the transactions again.
        </p>
      </div>
    </div>
    <UButton
      color="error"
      variant="outline"
      size="xs"
      label="Try again"
      class="self-start sm:self-auto"
      data-test="retry-safe-transactions-button"
      @click="emit('retry')"
    />
  </div>

  <div
    v-else-if="isLoading"
    class="flex min-h-36 flex-col items-center justify-center gap-3 text-center"
    role="status"
    aria-live="polite"
    data-test="safe-transactions-loading"
  >
    <UIcon name="i-lucide-loader-circle" class="text-primary h-8 w-8 animate-spin" />
    <div>
      <p class="font-medium">Loading Safe transactions</p>
      <p class="text-sm text-gray-500">Checking approvals and execution status…</p>
    </div>
  </div>

  <div
    v-else-if="isEmpty"
    class="flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
    data-test="safe-transactions-empty"
  >
    <div class="bg-primary/10 flex h-11 w-11 items-center justify-center rounded-full">
      <UIcon name="i-lucide-list-checks" class="text-primary h-5 w-5" />
    </div>
    <div>
      <p class="font-medium">
        {{
          selectedStatus === 'all'
            ? 'No Safe transactions yet'
            : selectedStatus === 'needs-action'
              ? 'No transactions need action'
              : 'No matching transactions'
        }}
      </p>
      <p class="mt-1 max-w-md text-sm text-gray-500">{{ emptyDescription }}</p>
    </div>
    <UButton
      v-if="selectedStatus !== 'all'"
      color="neutral"
      variant="outline"
      size="sm"
      label="Show all transactions"
      data-test="clear-safe-transaction-filter"
      @click="emit('clear')"
    />
  </div>
</template>

<script setup lang="ts">
import type { SafeTransactionStatusFilter } from '@/utils/safe/transactionState'

interface Props {
  hasError: boolean
  isLoading: boolean
  isEmpty: boolean
  selectedStatus: SafeTransactionStatusFilter
  emptyDescription: string
}

defineProps<Props>()

const emit = defineEmits<{
  retry: []
  clear: []
}>()
</script>
