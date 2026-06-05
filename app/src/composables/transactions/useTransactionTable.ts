import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { groupTransactionsByTxHash, getTransactionTypeLabel } from '@/utils'
import type { GroupedTransactionRow } from '@/types/transaction-history'
import { usePagination } from '@/composables/usePagination'

type TransactionBase = {
  txHash: string
  type: string
  date: string | number
  from: string
  to: string
  amount: string | number
  amountUSD: number
  tokenAddress: string
  token: string
  amountLocal?: number
}

export const childHidden = (cell: { row: { depth: number } }) =>
  cell.row.depth > 0 ? 'hidden' : ''

export interface UseTransactionTableOptions {
  /**
   * Query-param prefix passed through to `usePagination` so several paginated
   * tables can share one route without colliding (e.g. the Company Payroll view
   * renders both WeeklyClaim and CashRemuneration transactions). Omit on
   * single-table routes for the bare `page` / `pageSize` params.
   */
  key?: string
}

export const useTransactionTable = <T extends TransactionBase>(
  transactions: ComputedRef<T[]>,
  options: UseTransactionTableOptions = {}
) => {
  const dateRange = ref<[Date, Date] | null>(null)
  const selectedType = ref('all')

  const uniqueTypes = computed(() => {
    const types = new Set(transactions.value.map((tx) => tx.type))
    return Array.from(types).sort()
  })

  const typeOptions = computed(() => [
    { label: 'All Types', value: 'all' },
    ...uniqueTypes.value
      .map((type) => ({ label: getTransactionTypeLabel(type), value: type }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ])

  const filteredTransactions = computed(() => {
    let filtered = transactions.value

    if (dateRange.value) {
      const [startDate, endDate] = dateRange.value
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.date)
        return txDate >= startDate && txDate <= endDate
      })
    }

    if (selectedType.value !== 'all') {
      filtered = filtered.filter((tx) => tx.type === selectedType.value)
    }

    return filtered
  })

  const groupedTransactions = computed<GroupedTransactionRow<T>[]>(() =>
    groupTransactionsByTxHash(filteredTransactions.value)
  )

  const total = computed(() => groupedTransactions.value.length)

  // Route-bound page + size (shareable, reload-safe) with resize anchoring —
  // see usePagination. Default page size stays 20 to match the previous client.
  const { page, pageSize, reset } = usePagination(() => total.value, { key: options.key })

  const displayedTransactions = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return groupedTransactions.value.slice(start, start + pageSize.value)
  })

  const expandedRows = ref<Record<string, boolean>>({})
  const getSubRows = (row: GroupedTransactionRow<T>): GroupedTransactionRow<T>[] =>
    row.subRows ?? []

  const selectedTx = ref<T | null>(null)
  const showDetail = ref(false)
  const openDetail = (row: T) => {
    selectedTx.value = row
    showDetail.value = true
  }

  // A filter change can shrink the list under the current page — go back to
  // page 1. Page-size changes are handled by usePagination's resize anchoring
  // (no reset), so there's no pageSize watcher here anymore.
  watch(filteredTransactions, () => {
    reset()
    expandedRows.value = {}
  })

  watch(page, () => {
    expandedRows.value = {}
  })

  return {
    dateRange,
    selectedType,
    typeOptions,
    page,
    pageSize,
    total,
    displayedTransactions,
    expandedRows,
    getSubRows,
    selectedTx,
    showDetail,
    openDetail
  }
}
