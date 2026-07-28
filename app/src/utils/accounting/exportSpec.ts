/**
 * The export contract shared by the PDF and Excel exporters and the section
 * picker: which accounting sections to export, and the filter state each section
 * is currently showing. Format-agnostic — it belongs to neither builder, so both
 * (and the view) depend on this module rather than on each other.
 */
import type { LedgerColumnKey } from '@/utils/accounting/ledgerPresenter'

/** The exportable accounting sections, in display order. */
export type SectionKey = 'summary' | 'income' | 'balance' | 'trial' | 'ledger'

/**
 * A section to export, plus the filter state that section is currently showing.
 * The per-page exports pass the page's live period / category / columns so the
 * file matches exactly what's on screen; the Summary report leaves them unset
 * to export the whole book.
 */
export interface SectionSpec {
  key: SectionKey
  /** Income Statement / General Ledger reporting-period bounds. */
  from?: Date | null
  to?: Date | null
  /** Balance Sheet / Trial Balance point-in-time "as of" date. */
  asOf?: Date | null
  /** General Ledger active category filter (`'All'` or a category). */
  filter?: string
  /** General Ledger visible columns. */
  columns?: LedgerColumnKey[]
  /**
   * General Ledger currency selection — the subset of currencies in view. Unset
   * (or all currencies) means no currency narrowing.
   */
  currencies?: string[]

  account?: string | readonly string[]
  accountLabel?: string
  accountTotal?: string
}
