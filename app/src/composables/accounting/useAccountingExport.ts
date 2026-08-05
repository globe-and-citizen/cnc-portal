/**
 * Accounting export orchestration for the view tree.
 *
 * Wraps the pure PDF / Excel builders ({@link buildTables} / {@link buildSheets})
 * with the live books, the party-name resolver and toast + error handling, so a
 * page only has to declare *which* sections (and their current filter state) to
 * export. Snapshots the reactive context into a plain {@link CncAccounting} at
 * call time, so the file reflects exactly what's on screen when the button is hit.
 */
import { useAccountingContext } from './useAccountingContext'
import type { CncAccounting } from '@/utils/accounting/assemble'
import { resolveUser } from '@/utils/transactionHistoryUtil'
import { log } from '@/utils'
import { buildTables, exportTablesPdf, type ExportPdfOptions } from '@/utils/accountingPdf'
import type { SectionSpec } from '@/utils/accounting/exportSpec'
import { buildSheets, exportSheetsExcel } from '@/utils/accountingExport'

export function useAccountingExport() {
  const acc = useAccountingContext()
  const toast = useToast()

  // Resolve a ledger party's address to its member/contract display name for the
  // "Activity" column, mirroring what the on-screen ledger shows via avatars.
  const resolveName = (address: string) => resolveUser(address).name

  /** Freeze the reactive books into a plain value for the pure builders. */
  const snapshot = (): CncAccounting => ({
    entries: acc.entries.value,
    summary: acc.summary.value,
    generalLedger: acc.generalLedger.value,
    incomeStatement: acc.incomeStatement.value,
    balanceSheet: acc.balanceSheet.value
  })

  async function exportPdf(
    specs: SectionSpec[],
    opts: ExportPdfOptions,
    successMessage = 'Exported to PDF'
  ): Promise<void> {
    try {
      await exportTablesPdf(buildTables(snapshot(), specs, resolveName), opts)
      toast.add({ title: successMessage, color: 'success' })
    } catch (error) {
      log.error('Accounting PDF export failed', error)
      toast.add({ title: 'PDF export failed', color: 'error' })
    }
  }

  async function exportExcel(
    specs: SectionSpec[],
    filename: string,
    successMessage = 'Exported to Excel'
  ): Promise<void> {
    try {
      await exportSheetsExcel(buildSheets(snapshot(), specs, resolveName), filename)
      toast.add({ title: successMessage, color: 'success' })
    } catch (error) {
      log.error('Accounting Excel export failed', error)
      toast.add({ title: 'Export failed', color: 'error' })
    }
  }

  return { exportPdf, exportExcel }
}
