import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { Ref } from 'vue'
import { renderWithProviders } from '@/tests/mocks'
import { buildJournal } from '@/utils/accounting/generalLedger'
import { makeEntry } from '@/utils/accounting/ledgerEntry'
import type { JournalEntry } from '@/utils/accounting/journalEntry'
import AccountingSummary from '../AccountingSummary.vue'

const state = vi.hoisted(() => ({
  journal: null as Ref<JournalEntry[]> | null,
  exportPdf: vi.fn(),
  exportExcel: vi.fn()
}))

vi.mock('@/composables/accounting/useAccountingContext', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  const { sampleBooks } = await import('@/utils/accounting/__tests__/fixtures')
  state.journal = ref([])
  // No raw entries: the count must depend on the journal, just like the exports.
  return { useAccountingContext: () => ({ journal: state.journal, reports: ref(sampleBooks()) }) }
})

vi.mock('@/composables/accounting/useAccountingExport', () => ({
  useAccountingExport: () => ({ exportPdf: state.exportPdf, exportExcel: state.exportExcel })
}))

const TX = `0x${'a'.repeat(64)}`
const bankTransfer = makeEntry({
  id: `${TX}-1`,
  timestamp: 100,
  useCase: 'INTERNAL',
  debit: 'Cash — Payroll',
  credit: 'Cash — Bank',
  amountUsd: 100,
  token: 'usdc',
  rawAmount: '100000000',
  internal: true
})
const fee = makeEntry({
  ...bankTransfer,
  id: `${TX}-2`,
  useCase: 'FEE',
  debit: 'Transaction Fee Expense',
  amountUsd: 1,
  rawAmount: '1000000',
  internal: false
})
const repayments = [1, 2, 3, 4].map((index) =>
  makeEntry({
    ...bankTransfer,
    id: `${TX}-${index}`,
    useCase: 'UC-CREDIT-03',
    debit: 'Loan Payable',
    amountUsd: 2,
    rawAmount: '2000000',
    internal: false
  })
)
const memo = makeEntry({
  ...bankTransfer,
  id: 'synthetic-share-note',
  sourceOperationId: 'synthetic-share-note',
  txHash: undefined,
  debit: null,
  credit: null,
  amountUsd: 0,
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
  wrapper = renderWithProviders(AccountingSummary)
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
      state.journal!.value = buildJournal(postings)
      const view = await openExport()

      expect(view.get('[data-test="section-ledger"]').text()).toContain(`${count} entries`)
    }
  )

  it('updates an open export dialog when the journal is refreshed or cleared', async () => {
    const view = await openExport()
    expect(view.get('[data-test="section-ledger"]').text()).toContain('0 entries')

    state.journal!.value = buildJournal([...repayments, memo])
    await flushPromises()
    expect(view.get('[data-test="section-ledger"]').text()).toContain('2 entries')

    state.journal!.value = []
    await flushPromises()
    expect(view.get('[data-test="section-ledger"]').text()).toContain('0 entries')
  })
})
