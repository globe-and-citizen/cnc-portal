import { computed, ref, type Ref } from 'vue'
import { useAccountingExport } from './useAccountingExport'
import {
  accountNet,
  accountOpening,
  entriesForAccount,
  type AccountOpening,
  type AccountSelection
} from '@/utils/accounting/accountLedger'
import { exportFilename } from '@/utils/accounting/exportNaming'
import { money } from '@/utils/accounting/presenter'
import type { LedgerColumnKey } from '@/utils/accounting/ledgerPresenter'
import type { Account } from '@/utils/accounting/accountRegistry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { SectionSpec } from '@/utils/accounting/exportSpec'
import type { JournalEntry } from '@/utils/accounting/journalEntry'

/** The reporting window a drill-down inherits from its statement. */
export interface DrilldownBounds {
  from: Date | null
  to: Date | null
}

type SingleAccountSelection = Account | AccountName

function isAggregateSelection(selection: AccountSelection): selection is readonly AccountName[] {
  return Array.isArray(selection)
}

function isConcreteAccount(selection: AccountSelection): selection is Account {
  return !isAggregateSelection(selection) && typeof selection !== 'string'
}

/**
 * The running-balance context for a drill-down. Aggregates intentionally carry
 * no `account`: a mixed-class line has no single normal side to run.
 */
export interface DrilldownBalance {
  account: SingleAccountSelection | null
  opening: AccountOpening
  closing: string
}

/** The statement line currently shown in the drill-down modal. */
export interface LedgerDrilldownLine {
  accounts: AccountSelection
  label: string
  total: string
}

function accountIdsForSelection(
  entries: readonly JournalEntry[],
  selection: AccountSelection
): string[] {
  if (isConcreteAccount(selection)) return [selection.id]
  const families = new Set(isAggregateSelection(selection) ? selection : [selection])
  return [
    ...new Set(
      entries.flatMap((entry) =>
        entry.lines
          .filter((line) => families.has(line.account.family.name))
          .map((line) => line.account.id)
      )
    )
  ].sort()
}

export function useLedgerDrilldown(
  entries: Ref<readonly JournalEntry[]>,
  bounds: () => DrilldownBounds
) {
  const open = ref(false)
  const target = ref<AccountSelection | null>(null)
  const displayName = ref('')
  const lineTotal = ref('')

  const balanceAccount = computed<SingleAccountSelection | null>(() => {
    const selected = target.value
    return selected && !isAggregateSelection(selected) ? selected : null
  })

  // The selected account controls which whole JournalEntry records appear; every
  // line of each selected entry remains visible, including an ordinary fee line.
  const drilldownEntries = computed(() => {
    const selected = target.value
    if (!selected || (isAggregateSelection(selected) && selected.length === 0)) return []
    const { from, to } = bounds()
    return entriesForAccount(entries.value, selected, from, to)
  })

  // A single account or family has one normal side. Aggregates can mix classes,
  // so their displayed statement figure remains authoritative.
  const total = computed(() =>
    balanceAccount.value
      ? money(accountNet(drilldownEntries.value, balanceAccount.value))
      : lineTotal.value
  )

  const selectedLine = computed<LedgerDrilldownLine | null>(() => {
    if (!target.value || (isAggregateSelection(target.value) && target.value.length === 0))
      return null
    return { accounts: target.value, label: displayName.value, total: total.value }
  })

  const opening = computed(() => accountOpening(entries.value, balanceAccount.value, bounds().from))

  const closing = computed(() =>
    balanceAccount.value
      ? money(opening.value.balance + accountNet(drilldownEntries.value, balanceAccount.value))
      : total.value
  )

  /** Open the popup for one concrete account, one chart family, or an aggregate. */
  function openFor(account: AccountSelection, lineValue: string, label?: string): void {
    target.value = account
    displayName.value = label ?? (typeof account === 'string' ? account : 'Aggregate')
    if (isConcreteAccount(account)) displayName.value = label ?? account.family.name
    lineTotal.value = lineValue
    open.value = true
  }

  const { exportPdf, exportExcel } = useAccountingExport()

  /** Export the same complete JournalEntry scope and visible columns as the modal. */
  function onExport(format: 'pdf' | 'excel', columns: LedgerColumnKey[]): void {
    const line = selectedLine.value
    if (!line) return
    const { from, to } = bounds()
    const spec: SectionSpec = {
      key: 'ledger',
      from,
      to,
      columns,
      journalAccounts: accountIdsForSelection(entries.value, line.accounts),
      journalAccountLabel: line.label,
      journalAccountTotal: line.total
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

  const balance = computed<DrilldownBalance>(() => ({
    account: balanceAccount.value,
    opening: opening.value,
    closing: closing.value
  }))

  return { open, selectedLine, balance, drilldownEntries, openFor, onExport }
}
