import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { Ref } from 'vue'
import { renderWithProviders } from '@/tests/mocks'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import { makeJournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import type { JournalEntry } from '@/utils/accounting/types'
import SummaryView from '../SummaryView.vue'

const state = vi.hoisted(() => ({
  journal: null as Ref<JournalEntry[]> | null,
  exportPdf: vi.fn(),
  exportExcel: vi.fn()
}))

vi.mock('@/composables/accounting/useAccountingContext', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  state.journal = ref([])
  // No raw entries: the count must depend on the journal, just like the exports.
  return { useAccountingContext: () => ({ journal: state.journal }) }
})

vi.mock('@/composables/accounting/useAccountingExport', () => ({
  useAccountingExport: () => ({ exportPdf: state.exportPdf, exportExcel: state.exportExcel })
}))

const TX = `0x${'a'.repeat(64)}`
const bankTransfer = makeJournalEntryDraft({
  id: `${TX}-1`,
  timestamp: 100,
  useCase: 'INTERNAL',
  debit: 'Cash — Payroll',
  credit: 'Cash — Bank',
  token: 'usdc',
  rawAmount: '100000000',
  rate: 1,
  memo: 'Fund payroll',
  internal: true
})
const fee = makeJournalEntryDraft({
  ...bankTransfer,
  id: `${TX}-2`,
  useCase: 'FEE',
  debit: 'Transaction Fee Expense',
  rawAmount: '1000000',
  internal: false
})
const repayments = [1, 2, 3, 4].map((index) =>
  makeJournalEntryDraft({
    ...bankTransfer,
    id: `${TX}-${index}`,
    useCase: 'UC-CREDIT-03',
    debit: 'Loan Payable',
    rawAmount: '2000000',
    internal: false
  })
)
const memo = makeJournalEntryDraft({
  ...bankTransfer,
  id: 'synthetic-share-note',
  sourceOperationId: 'synthetic-share-note',
  txHash: undefined,
  debit: null,
  credit: null,
  rawAmount: '0',
  shares: '2'
})

let wrapper: ReturnType<typeof renderWithProviders> | undefined

beforeEach(() => {
  vi.clearAllMocks()
  state.journal!.value = []
})

afterEach(() => wrapper?.unmount())

async function openExport() {
  wrapper = renderWithProviders(SummaryView)
  await wrapper.get('[data-test="open-export-report"]').trigger('click')
  await flushPromises()
  return wrapper
}

describe('Summary journal export count', () => {
  it.each([
    { name: 'empty books', postings: [], count: 0 },
    { name: 'one Bank transfer with a fee', postings: [bankTransfer, fee], count: 1 },
    { name: 'one multi-recipient repayment', postings: repayments, count: 1 },
    { name: 'a memo-only operation', postings: [memo], count: 1 },
    { name: 'monetary and memo operations', postings: [bankTransfer, fee, memo], count: 2 }
  ])(
    'counts $name from JournalEntry records, not source postings or lines',
    async ({ postings, count }) => {
      state.journal!.value = finalizeJournal(postings)
      const view = await openExport()

      expect(view.get('[data-test="section-ledger"]').text()).toContain(`${count} entries`)
    }
  )

  it('updates an open export dialog when the journal is refreshed or cleared', async () => {
    const view = await openExport()
    expect(view.get('[data-test="section-ledger"]').text()).toContain('0 entries')

    state.journal!.value = finalizeJournal([...repayments, memo])
    await flushPromises()
    expect(view.get('[data-test="section-ledger"]').text()).toContain('2 entries')

    state.journal!.value = []
    await flushPromises()
    expect(view.get('[data-test="section-ledger"]').text()).toContain('0 entries')
  })
})
