/**
 * Download filenames for the accounting exports.
 *
 * Each per-page export names its file after the active scope — the selected
 * reporting period / "as of" date, and (for the ledger) the active category — so
 * a folder of downloads is self-describing rather than a pile of
 * `general-ledger.pdf` collisions. Pure and unit-tested; the PDF/Excel builders
 * own the in-file heading ({@link incomeExportTitle} et al.), this owns the name
 * on disk. The income statement always spells out its period (including "All
 * time") so every file states what it covers; the ledger appends the period only
 * when a real date range is set — an all-time export needs no date suffix.
 */
import { periodLabel, dayLabel } from './presenter'
import type { SectionSpec } from './exportSpec'

/** Drop characters no major filesystem allows in a name, and collapse whitespace. */
function safeName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The self-describing base name (no extension) for a section's export. */
export function exportBaseName(spec: SectionSpec): string {
  switch (spec.key) {
    case 'summary':
      return 'Accounting Report'
    case 'income':
      return `Income Statement - ${periodLabel(spec.from, spec.to)}`
    case 'balance':
      return spec.asOf ? `Balance Sheet - As of ${dayLabel(spec.asOf)}` : 'Balance Sheet'
    case 'trial':
      return spec.asOf ? `Trial Balance - As of ${dayLabel(spec.asOf)}` : 'Trial Balance'
    case 'ledger': {
      const parts = ['General Ledger', spec.filter && spec.filter !== 'All' ? spec.filter : 'All']
      // A date suffix only when the page carries a real range; all-time needs none.
      if (spec.from || spec.to) parts.push(periodLabel(spec.from, spec.to))
      return parts.join(' - ')
    }
  }
}

/** The full download filename (`<base>.<ext>`) for a section's export. */
export function exportFilename(spec: SectionSpec, ext: 'pdf' | 'xlsx'): string {
  return `${safeName(exportBaseName(spec))}.${ext}`
}
