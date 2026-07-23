import { computed, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useTransactionTable, childHidden, childRowClass } from '../useTransactionTable'

type TransactionFixture = {
  txHash: string
  type: string
  date: string
  amount: string
}

const buildTransactions = (count: number): TransactionFixture[] =>
  Array.from({ length: count }, (_, index) => ({
    txHash: `0xtx-${index}`,
    type: index % 2 === 0 ? 'deposit' : 'transfer',
    date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
    amount: String(index)
  }))

describe('useTransactionTable', () => {
  it('groups by txHash and paginates displayed rows', () => {
    const source = ref<TransactionFixture[]>([
      {
        txHash: '0xshared',
        type: 'deposit',
        date: new Date(Date.UTC(2025, 0, 3)).toISOString(),
        amount: '2'
      },
      {
        txHash: '0xsingle',
        type: 'transfer',
        date: new Date(Date.UTC(2025, 0, 2)).toISOString(),
        amount: '1'
      },
      {
        txHash: '0xshared',
        type: 'tokenDeposit',
        date: new Date(Date.UTC(2025, 0, 1)).toISOString(),
        amount: '0'
      }
    ])

    const table = useTransactionTable(computed(() => source.value))

    expect(table.total.value).toBe(2)
    expect(table.displayedTransactions.value).toHaveLength(2)
    expect(table.displayedTransactions.value[0]?.groupedEventCount).toBe(2)
    expect(table.displayedTransactions.value[0]?.subRows).toHaveLength(1)
  })

  it('resets page and clears expanded rows when filters change', async () => {
    const source = ref(buildTransactions(25))
    const table = useTransactionTable(computed(() => source.value))

    table.page.value = 2
    table.expandedRows.value = { '0': true }

    table.selectedType.value = 'deposit'
    await nextTick()

    expect(table.page.value).toBe(1)
    expect(table.expandedRows.value).toEqual({})
    expect(table.displayedTransactions.value.every((row) => row.type === 'deposit')).toBe(true)
  })

  it('clears expanded rows when page changes', async () => {
    const source = ref(buildTransactions(25))
    const table = useTransactionTable(computed(() => source.value))

    table.expandedRows.value = { '0': true }
    table.page.value = 2
    await nextTick()

    expect(table.expandedRows.value).toEqual({})
  })

  it('keeps expanded rows and page when the underlying data refreshes without a filter change', async () => {
    const source = ref(buildTransactions(25))
    const table = useTransactionTable(computed(() => source.value))

    table.page.value = 2
    await nextTick()
    table.expandedRows.value = { '0': true }
    await nextTick()

    // Simulate a poll-driven refetch: new array reference, same shape.
    source.value = buildTransactions(25)
    await nextTick()

    expect(table.page.value).toBe(2)
    expect(table.expandedRows.value).toEqual({ '0': true })
  })

  it('resets page to first page when page size changes', async () => {
    const source = ref(buildTransactions(25))
    const table = useTransactionTable(computed(() => source.value))

    table.page.value = 2
    await nextTick()

    table.pageSize.value = 50
    await nextTick()

    expect(table.page.value).toBe(1)
    expect(table.displayedTransactions.value).toHaveLength(25)
  })

  it('filters rows by date range', async () => {
    const source = ref(buildTransactions(10))
    const table = useTransactionTable(computed(() => source.value))

    table.dateRange.value = [
      new Date(Date.UTC(2025, 0, 3)),
      new Date(Date.UTC(2025, 0, 5, 23, 59, 59))
    ]
    await nextTick()

    expect(table.displayedTransactions.value).toHaveLength(3)
    expect(table.total.value).toBe(3)
  })
})

describe('transaction table row meta helpers', () => {
  it('childRowClass elevates grouped child rows only', () => {
    expect(childRowClass({ depth: 0 })).toBe('')
    expect(childRowClass({ depth: 1 })).toBe('bg-elevated')
  })

  it('childHidden hides cells on child rows only', () => {
    expect(childHidden({ row: { depth: 0 } })).toBe('')
    expect(childHidden({ row: { depth: 1 } })).toBe('hidden')
  })
})
