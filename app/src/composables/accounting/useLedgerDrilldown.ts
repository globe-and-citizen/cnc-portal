import { computed, ref, type Ref } from 'vue'
import { useAccountingExport } from './useAccountingExport'
import {
  entriesForAccount,
  accountBalance,
  accountNet,
  accountOpening,
  type InstanceScope
} from '@/utils/accounting/accountLedger'
import { exportFilename } from '@/utils/accounting/exportNaming'
import { money } from '@/utils/accounting/presenter'
import type { LedgerColumnKey } from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

/** The reporting window a drill-down inherits from its statement. */
export interface DrilldownBounds {
  from: Date | null
  to: Date | null
}

/** The statement line currently shown in the drill-down modal. */
export interface LedgerDrilldownLine {
  accounts: string | string[]
  label: string
  total: string
}

export function useLedgerDrilldown(
  entries: Ref<readonly LedgerEntry[]>,
  bounds: () => DrilldownBounds
) {
  const open = ref(false)
  // The account(s) the popup scopes to, and the name/figure shown for the line.
  const target = ref<string | string[]>('')
  const displayName = ref('')
  const lineTotal = ref('')
  // The pocket-instance scope, when the line is one split row of a redeployed pocket.
  const targetScope = ref<InstanceScope | undefined>(undefined)

  const isAggregate = computed(() => Array.isArray(target.value))

  // The one account the running-balance column runs on — empty for an aggregate,
  // whose accounts span classes and so share no natural side.
  const balanceAccount = computed(() => (isAggregate.value ? '' : (target.value as string)))

  // The postings composing the drilled-in line, over the statement's own window.
  const drilldownEntries = computed(() => {
    const t = target.value
    if (!t || (Array.isArray(t) && t.length === 0)) return []
    const { from, to } = bounds()
    return entriesForAccount(entries.value, t, from, to, targetScope.value)
  })

  // A single account nets from its own postings; an aggregate can't (mixed
  // classes), so it keeps the figure the line already shows.
  const total = computed(() =>
    typeof target.value === 'string' && target.value
      ? accountBalance(drilldownEntries.value, target.value)
      : lineTotal.value
  )

  const selectedLine = computed<LedgerDrilldownLine | null>(() => {
    if (!target.value || (Array.isArray(target.value) && target.value.length === 0)) return null
    return {
      accounts: target.value,
      label: displayName.value,
      total: total.value
    }
  })

  // What the account brought into the window — the ledger's "Opening balance"
  // line. Nothing precedes an open-ended window, nor an aggregate line.
  const opening = computed(() =>
    accountOpening(entries.value, balanceAccount.value, bounds().from, targetScope.value)
  )

  // Where the account is left once every posting in the window is booked — the
  // figure at the foot of the Balance column.
  const closing = computed(() =>
    balanceAccount.value
      ? money(opening.value.balance + accountNet(drilldownEntries.value, balanceAccount.value))
      : total.value
  )

  /**
   * Open the popup for a line. Pass one account name, or a list of accounts plus
   * a `label` for an aggregate. `lineValue` is the figure shown on the line.
   */
  function openFor(
    account: string | string[],
    lineValue: string,
    label?: string,
    scope?: InstanceScope
  ): void {
    target.value = account
    displayName.value = label ?? (typeof account === 'string' ? account : 'Aggregate')
    lineTotal.value = lineValue
    targetScope.value = scope
    open.value = true
  }

  const { exportPdf, exportExcel } = useAccountingExport()

  // Export exactly the drilled-in ledger, over the same window and columns,
  // through the shared PDF / Excel pipeline. An aggregate carries its label and
  // total, which the pipeline can't recompute.
  function onExport(format: 'pdf' | 'excel', columns: LedgerColumnKey[]): void {
    const line = selectedLine.value
    if (!line) return
    const { from, to } = bounds()
    const spec: SectionSpec = {
      key: 'ledger',
      account: line.accounts,
      from,
      to,
      columns,
      ...(targetScope.value?.instance
        ? { instance: targetScope.value.instance, includeBlank: targetScope.value.includeBlank }
        : {}),
      ...(isAggregate.value ? { accountLabel: line.label, accountTotal: line.total } : {})
    }
    if (format === 'excel') {
      exportExcel([spec], exportFilename(spec, 'xlsx'), `${line.label} ledger exported to Excel`)
    } else {
      exportPdf(
        [spec],
        { filename: exportFilename(spec, 'pdf') },
        `${line.label} ledger exported to PDF`
      )
    }
  }

  return {
    open,
    selectedLine,
    balanceAccount,
    opening,
    closing,
    drilldownEntries,
    openFor,
    onExport
  }
}
