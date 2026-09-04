import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { useAccountingExport } from '@/composables/accounting/useAccountingExport'
import { mockToast } from '@/tests/mocks/store.mock'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

const {
  buildTables,
  exportTablesPdf,
  buildSheets,
  exportSheetsExcel,
  entries,
  accountRegistry,
  journal,
  reports,
  resolveUser
} = vi.hoisted(() => ({
  buildTables: vi.fn(() => ['pdf-table']),
  exportTablesPdf: vi.fn(),
  buildSheets: vi.fn(() => ['excel-sheet']),
  exportSheetsExcel: vi.fn(),
  entries: [{ id: 'e1' }],
  accountRegistry: { accounts: [], resolve: vi.fn(), get: vi.fn() },
  journal: [],
  reports: { trialBalance: [] },
  resolveUser: vi.fn(() => ({ name: 'Ali' }))
}))

// The composable takes `useToast` from @nuxt/ui's auto-import, which resolves to the
// runtime file rather than the '@nuxt/ui/composables' entry the global setup mocks.
vi.mock('../../../../node_modules/@nuxt/ui/dist/runtime/composables/useToast.js', () => ({
  useToast: () => mockToast
}))
vi.mock('@/lib/accounting/pdf', () => ({ buildTables, exportTablesPdf }))
vi.mock('@/lib/accounting/spreadsheet', () => ({ buildSheets, exportSheetsExcel }))
vi.mock('@/composables/transactions/useTransactionPresentation', () => ({
  useTransactionPresentation: () => ({ resolveUser })
}))
vi.mock('@/composables/accounting/useAccountingContext', () => ({
  useAccountingContext: () => ({
    entries: ref(entries),
    accountRegistry: ref(accountRegistry),
    journal: ref(journal),
    reports: computed(() => reports)
  })
}))

const specs = [{ key: 'ledger' }] as SectionSpec[]

describe('useAccountingExport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exports a PDF from a snapshot of the live books', async () => {
    await useAccountingExport().exportPdf(specs, { filename: 'ledger.pdf' })
    expect(buildTables).toHaveBeenCalledWith(
      { entries, accountRegistry, journal, unmatchedFeeOperationIds: [], ...reports },
      specs,
      expect.any(Function)
    )
    expect(exportTablesPdf).toHaveBeenCalledWith(['pdf-table'], { filename: 'ledger.pdf' })
    expect(mockToast.add).toHaveBeenCalledWith({ title: 'Exported to PDF', color: 'success' })
  })

  it('resolves a party address to the name the on-screen ledger shows', async () => {
    await useAccountingExport().exportPdf(specs, { filename: 'ledger.pdf' })
    const resolveName = buildTables.mock.calls[0][2] as (address: string) => string
    expect(resolveName('0xabc')).toBe('Ali')
    expect(resolveUser).toHaveBeenCalledWith('0xabc')
  })

  it('exports an Excel workbook and confirms with a custom message', async () => {
    await useAccountingExport().exportExcel(specs, 'ledger.xlsx', 'Ledger saved')
    expect(buildSheets).toHaveBeenCalledWith(
      { entries, accountRegistry, journal, unmatchedFeeOperationIds: [], ...reports },
      specs,
      expect.any(Function)
    )
    expect(exportSheetsExcel).toHaveBeenCalledWith(['excel-sheet'], 'ledger.xlsx')
    expect(mockToast.add).toHaveBeenCalledWith({ title: 'Ledger saved', color: 'success' })
  })

  it('tells the user when a file cannot be produced', async () => {
    exportTablesPdf.mockRejectedValueOnce(new Error('jspdf blew up'))
    exportSheetsExcel.mockRejectedValueOnce(new Error('exceljs blew up'))
    await useAccountingExport().exportPdf(specs, { filename: 'ledger.pdf' })
    await useAccountingExport().exportExcel(specs, 'ledger.xlsx')
    expect(mockToast.add).toHaveBeenCalledWith({ title: 'PDF export failed', color: 'error' })
    expect(mockToast.add).toHaveBeenCalledWith({ title: 'Export failed', color: 'error' })
  })
})
