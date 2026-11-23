import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { Ref } from 'vue'
import { renderWithProviders } from '@/tests/mocks'
import { mockRoute } from '@/tests/mocks/router.mock'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import { makeJournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import { presentSummary } from '@/utils/accounting/presenter'
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

describe('US-ACCT-004 Summary export period', () => {
  const PERIOD_KEY = 'cnc-accounting-team-1-summary-period'
  const PERIOD_START = new Date(2026, 0, 1)
  const PERIOD_END = new Date(2026, 0, 31)
  const PERIOD_END_OF_DAY = new Date(2026, 0, 31, 23, 59, 59, 999)

  /** Seed the picker's remembered selection with a custom period. */
  function selectCustomPeriod(storageKey = PERIOD_KEY): void {
    const now = Date.now()
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        activeId: 'custom',
        anchors: { month: now, quarter: now, year: now },
        customDate: now,
        customStart: PERIOD_START.getTime(),
        customEnd: PERIOD_END.getTime()
      })
    )
  }

  const inJanuary = Math.floor(new Date(2026, 0, 15).getTime() / 1000)
  const inMarch = Math.floor(new Date(2026, 2, 15).getTime() / 1000)
  const MARCH_TX = `0x${'b'.repeat(64)}`
  const journalAcrossTwoMonths = () =>
    finalizeJournal([
      { ...bankTransfer, timestamp: inJanuary },
      makeJournalEntryDraft({
        ...bankTransfer,
        id: `${MARCH_TX}-1`,
        sourceOperationId: MARCH_TX,
        txHash: MARCH_TX,
        timestamp: inMarch
      })
    ])

  beforeEach(() => {
    localStorage.clear()
    mockRoute.params = { id: 'team-1' }
  })
  afterEach(() => localStorage.clear())

  it('[AC-US-ACCT-004-11] gives every exported section the same selected period', async () => {
    selectCustomPeriod()
    const view = await openExport()

    await view.get('[data-test="generate-pdf"]').trigger('click')

    const [specs, options] = state.exportPdf.mock.calls[0]!
    expect(specs).toHaveLength(6)
    for (const spec of specs) {
      expect(spec.from.getTime()).toBe(PERIOD_START.getTime())
      expect(spec.to.getFullYear()).toBe(2026)
      expect(spec.to.getMonth()).toBe(0)
      expect(spec.to.getDate()).toBe(31)
      expect(spec.asOf).toEqual(spec.to)
    }
    expect(options.filename).toMatch(/^Accounting Report - Jan 1, 2026 – Jan 31, 2026\.pdf$/)
    expect(options.coverage).toBe('Period Jan 1, 2026 – Jan 31, 2026')
  })

  it('applies the selected period to an Excel export too', async () => {
    selectCustomPeriod()
    const view = await openExport()

    await view.get('[data-test="generate-excel"]').trigger('click')

    const [specs, filename] = state.exportExcel.mock.calls[0]!
    expect(specs[0].from.getTime()).toBe(PERIOD_START.getTime())
    expect(filename).toMatch(/^Accounting Report - Jan 1, 2026 – Jan 31, 2026\.xlsx$/)
  })

  it('counts only the ledger entries inside the selected period', async () => {
    state.journal!.value = journalAcrossTwoMonths()
    selectCustomPeriod()
    const view = await openExport()

    expect(view.get('[data-test="section-ledger"]').text()).toContain('1 entries')
  })

  it('exports the whole book without dates on All time', async () => {
    state.journal!.value = journalAcrossTwoMonths()
    const view = await openExport()
    expect(view.get('[data-test="section-ledger"]').text()).toContain('2 entries')

    await view.get('[data-test="generate-pdf"]').trigger('click')

    const [specs, options] = state.exportPdf.mock.calls[0]!
    expect(specs[0]).toEqual({ key: 'summary', from: null, to: null, asOf: null })
    expect(options.filename).toBe('Accounting Report.pdf')
    expect(options).not.toHaveProperty('coverage')
  })

  it('[AC-US-ACCT-004-12] mentions the period to export in the dialog, without a second selector', async () => {
    selectCustomPeriod()
    const view = await openExport()

    expect(view.get('[data-test="export-period"]').text()).toContain('Jan 1, 2026 – Jan 31, 2026')
    expect(view.get('[data-test="export-period"]').find('button').exists()).toBe(false)
    expect(view.findAll('[data-test="date-picker-trigger"]')).toHaveLength(1)
  })

  it('[AC-US-ACCT-001-14] shows the Summary cards for the selected period', async () => {
    state.journal!.value = journalAcrossTwoMonths()
    selectCustomPeriod()
    wrapper = renderWithProviders(SummaryView)
    await flushPromises()

    const selected = presentSummary(state.journal!.value, PERIOD_START, PERIOD_END_OF_DAY)
    const wholeBook = presentSummary(state.journal!.value)
    expect(selected.banner.trial).not.toBe(wholeBook.banner.trial)
    expect(wrapper.get('[data-test="balance-banner"]').text()).toContain(selected.banner.trial)
  })

  it('[AC-US-ACCT-001-15] does not carry a selected date over to another team', async () => {
    state.journal!.value = journalAcrossTwoMonths()
    selectCustomPeriod('cnc-accounting-team-2-summary-period')
    const view = await openExport()

    expect(view.get('[data-test="date-picker-trigger"]').text()).toContain('All time')
    expect(view.get('[data-test="section-ledger"]').text()).toContain('2 entries')
  })
})

describe('Summary export sections', () => {
  const toggleAll = '[data-test="toggle-all-sections"]'

  it('offers Deselect all while every section is selected', async () => {
    const view = await openExport()
    expect(view.get(toggleAll).text()).toBe('Deselect all')

    await view.get(toggleAll).trigger('click')

    expect(view.get(toggleAll).text()).toBe('Select all')
    expect(view.get('[data-test="generate-pdf"]').attributes('disabled')).toBeDefined()
  })

  it('selects every section again from Select all', async () => {
    const view = await openExport()
    await view.get(toggleAll).trigger('click')

    await view.get(toggleAll).trigger('click')

    expect(view.get(toggleAll).text()).toBe('Deselect all')
    await view.get('[data-test="generate-pdf"]').trigger('click')
    expect(state.exportPdf.mock.calls[0]![0]).toHaveLength(6)
  })

  it('offers Account Assignments and exports it with the other sections', async () => {
    const view = await openExport()
    expect(view.get('[data-test="section-assignments"]').text()).toContain('Account Assignments')

    await view.get('[data-test="generate-pdf"]').trigger('click')

    const specs = state.exportPdf.mock.calls[0]![0] as { key: string }[]
    expect(specs.map((spec) => spec.key)).toContain('assignments')
  })
})
