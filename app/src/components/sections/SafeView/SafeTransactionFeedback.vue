<template>
  <UAlert
    v-if="hasError"
    class="mb-5"
    color="error"
    variant="soft"
    icon="i-lucide-circle-alert"
    title="Transactions could not be loaded"
    description="Your Safe information is still available. Check your connection and try loading the approval queue again."
    data-test="safe-transactions-error"
  >
    <template #actions>
      <UButton
        color="error"
        variant="outline"
        size="xs"
        label="Try again"
        data-test="retry-safe-transactions-button"
        @click="emit('retry')"
      />
    </template>
  </UAlert>

  <div
    v-else-if="isLoading"
    class="flex min-h-48 flex-col items-center justify-center gap-3 text-center"
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
    class="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
    data-test="safe-transactions-empty"
  >
    <div class="bg-primary/10 flex h-11 w-11 items-center justify-center rounded-full">
      <UIcon name="i-lucide-list-checks" class="text-primary h-5 w-5" />
    </div>
    <div>
      <p class="font-medium">
        {{ selectedStatus === 'all' ? 'No Safe transactions yet' : 'No matching transactions' }}
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
import type { SafeTransactionStatusFilter } from '@/utils/safeTransactionState'

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
