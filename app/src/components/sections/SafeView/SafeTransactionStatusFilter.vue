<template>
  <div
    class="flex gap-2 overflow-x-auto pb-1"
    role="toolbar"
    aria-label="Filter Safe transactions"
    data-test="safe-transaction-status-filter"
  >
    <button
      v-for="option in statusOptions"
      :key="option.value"
      type="button"
      class="focus-visible:ring-primary flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:outline-none"
      :class="
        selectedStatus === option.value
          ? 'border-primary bg-primary text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-950 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:text-white'
      "
      :aria-pressed="selectedStatus === option.value"
      :aria-label="`${option.label}: ${transactionCountLabel(counts[option.value])}`"
      :data-test="`safe-transaction-filter-${option.value}`"
      @click="selectStatus(option.value)"
    >
      <span>{{ option.label }}</span>
      <span
        class="min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs leading-none"
        :class="
          selectedStatus === option.value
            ? 'bg-white/20 text-white'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
        "
        aria-hidden="true"
      >
        {{ counts[option.value] }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type {
  SafeTransactionFilterCounts,
  SafeTransactionStatusFilter
} from '@/utils/safeTransactionState'

interface Props {
  counts: SafeTransactionFilterCounts
}

defineProps<Props>()

const emit = defineEmits<{
  statusChange: [value: SafeTransactionStatusFilter]
}>()

const selectedStatus = defineModel<SafeTransactionStatusFilter>({ default: 'needs-action' })

const statusOptions = [
  { value: 'needs-action', label: 'Needs action' },
  { value: 'pending', label: 'Needs approval' },
  { value: 'ready', label: 'Ready' },
  { value: 'conflicting', label: 'Conflicts' },
  { value: 'executed', label: 'Executed' },
  { value: 'all', label: 'All' }
] satisfies Array<{ value: SafeTransactionStatusFilter; label: string }>

const selectStatus = (status: SafeTransactionStatusFilter) => {
  selectedStatus.value = status
  emit('statusChange', status)
}

const transactionCountLabel = (count: number) =>
  count === 1 ? '1 transaction' : `${count} transactions`
</script>
