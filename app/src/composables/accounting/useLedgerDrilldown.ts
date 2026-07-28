import { computed, ref, type Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useAccountingExport } from './useAccountingExport'
import { entriesForAccount, accountBalance } from '@/utils/accounting/accountLedger'
import { exportFilename } from '@/utils/accounting/exportNaming'
import { LEDGER_COLUMNS, type LedgerColumnKey } from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

/** The reporting window a drill-down inherits from its statement. */
export interface DrilldownBounds {
  from: Date | null
  to: Date | null
}

export function useLedgerDrilldown(
  entries: Ref<readonly LedgerEntry[]>,
  bounds: () => DrilldownBounds,
  columnsStorageKey: string
) {
  const open = ref(false)
  // The account(s) the popup scopes to, and the name/figure shown for the line.
  const target = ref<string | string[]>('')
  const displayName = ref('')
  const lineTotal = ref('')

  // Show/hide drill-down columns — persisted so the choice sticks across
  // sessions, on a per-statement key so each card stays independent.
  const columns = useLocalStorage<LedgerColumnKey[]>(
    columnsStorageKey,
    LEDGER_COLUMNS.map((c) => c.value)
  )

  const isAggregate = computed(() => Array.isArray(target.value))

  // The postings composing the drilled-in line, over the statement's own window.
  const drilldownEntries = computed(() => {
    const t = target.value
    if (!t || (Array.isArray(t) && t.length === 0)) return []
    const { from, to } = bounds()
    return entriesForAccount(entries.value, t, from, to)
  })

  // A single account nets from its own postings; an aggregate can't (mixed
  // classes), so it keeps the figure the line already shows.
  const total = computed(() =>
    typeof target.value === 'string' && target.value
      ? accountBalance(drilldownEntries.value, target.value)
      : lineTotal.value
  )

  /**
   * Open the popup for a line. Pass one account name, or a list of accounts plus
   * a `label` for an aggregate. `lineValue` is the figure shown on the line.
   */
  function openFor(account: string | string[], lineValue: string, label?: string): void {
    target.value = account
    displayName.value = label ?? (typeof account === 'string' ? account : 'Aggregate')
    lineTotal.value = lineValue
    open.value = true
  }

  const { exportPdf, exportExcel } = useAccountingExport()

  // Export exactly the drilled-in ledger, over the same window and columns,
  // through the shared PDF / Excel pipeline. An aggregate carries its label and
  // total, which the pipeline can't recompute.
  function onExport(format: 'pdf' | 'excel'): void {
    const { from, to } = bounds()
    const spec: SectionSpec = {
      key: 'ledger',
      account: target.value,
      from,
      to,
      columns: columns.value,
      ...(isAggregate.value ? { accountLabel: displayName.value, accountTotal: total.value } : {})
    }
    if (format === 'excel') {
      exportExcel(
        [spec],
        exportFilename(spec, 'xlsx'),
        `${displayName.value} ledger exported to Excel`
      )
    } else {
      exportPdf(
        [spec],
        { filename: exportFilename(spec, 'pdf') },
        `${displayName.value} ledger exported to PDF`
      )
    }
  }

  return { open, account: displayName, total, columns, drilldownEntries, openFor, onExport }
}
