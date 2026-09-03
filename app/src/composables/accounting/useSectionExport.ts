/**
 * The Export / Print pair a single statement card wires to its export bar.
 *
 * Both buttons ship that one section, described by `spec()` at click time so the
 * file always matches the filters on screen, under a filename mirroring the same
 * scope ({@link exportFilename}). `label` names the statement in the success toast.
 */
import { useAccountingExport } from './useAccountingExport'
import { exportFilename } from '@/utils/accounting/exportNaming'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

export function useSectionExport(label: string, spec: () => SectionSpec) {
  const { exportPdf, exportExcel } = useAccountingExport()

  const onExport = (): void => {
    const section = spec()
    void exportExcel([section], exportFilename(section, 'xlsx'), `${label} exported to Excel`)
  }
  const onPrint = (): void => {
    const section = spec()
    void exportPdf(
      [section],
      { filename: exportFilename(section, 'pdf') },
      `${label} exported to PDF`
    )
  }

  return { onExport, onPrint }
}
