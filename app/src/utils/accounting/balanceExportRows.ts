/**
 * The Balance Sheet laid out as on screen: one block per section with its title,
 * column headers, account lines and total, then the closing "Liabilities + Equity"
 * line. Shared by the PDF and Excel exports so both keep the same structure.
 */
import type { BalanceLineView, presentBalance } from './presenter'
import type { UsdAmount } from './types'

export type BalanceExportRowKind = 'section' | 'columns' | 'line' | 'total' | 'gap' | 'grandTotal'

export interface BalanceExportRow {
  kind: BalanceExportRowKind
  account: string
  nature: string
  value: string
  /** Exact amount behind `value`, for exports that write numbers. */
  amount?: UsdAmount
}

function balanceExportSection(
  title: string,
  lines: readonly BalanceLineView[],
  total: Pick<BalanceExportRow, 'account' | 'value' | 'amount'>,
  valueLabel = 'Balance'
): BalanceExportRow[] {
  return [
    { kind: 'section', account: title, nature: '', value: '' },
    { kind: 'columns', account: 'Account', nature: 'Nature', value: valueLabel },
    ...lines.map(
      (line): BalanceExportRow => ({
        kind: 'line',
        account: line.label,
        nature: line.nature,
        value: line.value,
        amount: line.amount
      })
    ),
    { kind: 'total', nature: '', ...total },
    { kind: 'gap', account: '', nature: '', value: '' }
  ]
}

/** The Balance Sheet laid out as on screen, shared by the PDF and Excel exports. */
export function balanceExportRows(balance: ReturnType<typeof presentBalance>): BalanceExportRow[] {
  return [
    ...balanceExportSection('Assets', balance.assetLines, {
      account: 'Total assets',
      value: balance.totalAssets,
      amount: balance.amounts.totalAssets
    }),
    ...balanceExportSection('Liabilities', balance.liabilityLines, {
      account: 'Total liabilities',
      value: balance.totalLiabilities,
      amount: balance.amounts.totalLiabilities
    }),
    ...balanceExportSection('Equity', balance.equityLines, {
      account: 'Total equity',
      value: balance.totalEquity,
      amount: balance.amounts.totalEquity
    }),
    ...balanceExportSection(
      'Earnings to date calculation',
      balance.earningsLines,
      {
        account: 'Earnings to date',
        value: balance.earningsToDate,
        amount: balance.amounts.earningsToDate
      },
      'Contribution'
    ),
    {
      kind: 'grandTotal',
      account: 'Liabilities + Equity',
      nature: '',
      value: balance.liabilitiesPlusEquity,
      amount: balance.amounts.liabilitiesPlusEquity
    }
  ]
}
