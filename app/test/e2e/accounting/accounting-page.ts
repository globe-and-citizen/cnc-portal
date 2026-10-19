// Browser helpers for the Accounting section: reaching each report, reading what
// it renders, and driving the owner account-assignment editor. Every helper only
// sequences the visible product UI.
import { expect, type Locator, type Page } from '@playwright/test'
import { groupLedgerEntries, type LedgerLine, type LedgerView } from './accounting-books'

export type AccountingSection =
  | 'summary'
  | 'income'
  | 'balance'
  | 'trial'
  | 'ledger'
  | 'account-assignments'

/** The books are rebuilt from chain history on every load, so give them room. */
const BOOKS_TIMEOUT = 120_000

/** The first element each report renders once the books are complete. */
const READY_MARKER: Record<AccountingSection, string> = {
  summary: '[data-test="balance-banner"]',
  income: '.tabular-nums',
  balance: '[data-test="balance-assets"]',
  trial: 'table',
  ledger: 'table',
  'account-assignments': '[data-test="account-assignment-table"], [data-test="assignment-empty"]'
}

/**
 * Open one Accounting report and wait for the books to finish rebuilding. The
 * page mounts a report only once every applicable source is ready, so the report
 * marker doubles as the completeness signal.
 */
export async function openAccounting(
  page: Page,
  teamId: string,
  section: AccountingSection,
  query = ''
): Promise<void> {
  await page.goto(`/teams/${teamId}/accounting/${section}${query}`)
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/accounting/${section}`))
  await expect(page.locator(READY_MARKER[section]).first()).toBeVisible({ timeout: BOOKS_TIMEOUT })
}

/** Fail when Accounting is presenting incomplete books instead of final ones. */
export async function expectCompleteBooks(page: Page): Promise<void> {
  await expect(page.locator('[data-test="accounting-error"]')).toHaveCount(0)
  await expect(page.locator('[data-test="accounting-loading"]')).toHaveCount(0)
  await expect(page.locator('[data-test="accounting-gaps"]')).toHaveCount(0)
}

const reportTable = (page: Page): Locator => page.locator('table').first()

/** Read the General Ledger exactly as rendered, including its total footer. */
export async function readLedger(page: Page): Promise<LedgerView> {
  const table = reportTable(page)
  await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: BOOKS_TIMEOUT })
  const rows = await table.locator('tbody tr').evaluateAll((elements) =>
    elements.map((element) => {
      const cells = [...element.querySelectorAll('td')].map(
        (cell) => cell.textContent?.trim() ?? ''
      )
      return {
        date: cells[0] ?? '',
        action: cells[1] ?? '',
        transaction: cells[2] ?? '',
        txHash: element.querySelector('[data-test="ledger-tx-hash"]')?.getAttribute('title') ?? '',
        activity: cells[4] ?? '',
        account: cells[5] ?? '',
        currency: cells[6] ?? '',
        quantity: cells[7] ?? '',
        rate: cells[8] ?? '',
        dr: cells[9] ?? '',
        cr: cells[10] ?? ''
      }
    })
  )
  return groupLedgerEntries(rows as LedgerLine[])
}

/** The number of journal entries the General Ledger header reports. */
export async function ledgerEntryBadge(page: Page): Promise<number> {
  const badge = await page
    .getByText(/^\d+ entries$/)
    .first()
    .textContent()
  return Number(badge?.replace(/\D/g, '') ?? 0)
}

/**
 * Every "label to amount" pair a report card renders. Each displayed amount is
 * matched back to the nearest ancestor that actually names it, so a line whose
 * amount shares a wrapper with the hover "Details" affordance reads the same as a
 * plain total. The first label wins, and the search stops before leaving `scope`.
 */
export async function readAmounts(scope: Locator): Promise<Record<string, string>> {
  return scope.evaluate((node) => {
    const LABEL_SEARCH_DEPTH = 4
    const amounts: Record<string, string> = {}
    for (const cell of node.querySelectorAll('.tabular-nums')) {
      const value = cell.textContent?.trim() ?? ''
      if (!/^-?\$/.test(value)) continue
      let row: Element = cell
      let label = ''
      for (let depth = 0; depth < LABEL_SEARCH_DEPTH && row.parentElement && row !== node; ) {
        row = row.parentElement
        depth += 1
        label = (row.textContent ?? '')
          .replace(value, '')
          .replace(/Details/g, '')
          .trim()
        if (label) break
      }
      if (label && !(label in amounts)) amounts[label] = value
    }
    return amounts
  })
}

/** The Balance Sheet sections, each owning one table whose last row is its total. */
const BALANCE_SECTIONS = {
  assets: 'balance-assets',
  liabilities: 'balance-liabilities',
  equity: 'balance-equity',
  earnings: 'balance-earnings'
} as const

export type BalanceTotals = Record<keyof typeof BALANCE_SECTIONS, string>

/**
 * The four Balance Sheet section totals, taken from each section's own table
 * rather than matched by label, so a renamed or repeated caption cannot silently
 * drop one of them.
 */
export async function readBalanceTotals(page: Page): Promise<BalanceTotals> {
  const totals = {} as BalanceTotals
  for (const [key, dataTest] of Object.entries(BALANCE_SECTIONS)) {
    const total = page.locator(`[data-test="${dataTest}"] tbody tr`).last()
    await expect(total).toBeVisible({ timeout: BOOKS_TIMEOUT })
    totals[key as keyof BalanceTotals] =
      (await total.locator('td').last().textContent())?.trim() ?? ''
  }
  return totals
}

export interface TrialBalanceRow {
  account: string
  nature: string
  dr: string
  cr: string
}

/** Read the Trial Balance rows, including its Total footer. */
export async function readTrialBalance(page: Page): Promise<TrialBalanceRow[]> {
  const table = reportTable(page)
  await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: BOOKS_TIMEOUT })
  return table.locator('tbody tr').evaluateAll((elements) =>
    elements.map((element) => {
      const cells = [...element.querySelectorAll('td')].map(
        (cell) => cell.textContent?.trim() ?? ''
      )
      return {
        account: (cells[0] ?? '').replace(/Details$/, '').trim(),
        nature: cells[1] ?? '',
        dr: cells[2] ?? '',
        cr: cells[3] ?? ''
      }
    })
  )
}

/** The Summary metric cards, keyed by their label. */
export async function readSummaryCards(page: Page): Promise<Record<string, string>> {
  return page
    .locator('[data-test^="summary-"]')
    .evaluateAll((cards) =>
      Object.fromEntries(
        cards.map((card) => [
          card.getAttribute('data-test')?.replace('summary-', '') ?? '',
          card.querySelector('.text-2xl')?.textContent?.trim() ?? ''
        ])
      )
    )
}

/** Open the drill-down behind one General Ledger account link. */
export async function openAccountDrilldown(page: Page, account: string): Promise<Locator> {
  await page.locator(`[data-test="ledger-account-link-${account}"]`).first().click()
  await expect(page).toHaveURL(/\/accounting\/trial/)
  const drilldown = page.getByRole('dialog', { name: account })
  await expect(drilldown).toBeVisible({ timeout: BOOKS_TIMEOUT })
  return drilldown
}

const assignmentTrigger = (page: Page) =>
  page.locator('[data-test="ledger-account-assignment-trigger"]')

/** Assign one counter-account to the single eligible external withdrawal. */
export async function assignWithdrawalAccount(
  page: Page,
  account: string,
  memo: string
): Promise<void> {
  await assignmentTrigger(page).first().click()
  await page.locator('[data-test="ledger-account-assignment-select"]').click()
  await page.getByRole('option', { name: account, exact: true }).click()
  await page.locator('[data-test="ledger-account-assignment-memo"]').fill(memo)
  await page.locator('[data-test="ledger-account-assignment-save"]').click()
  await expect(page.getByText('Journal account assigned', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  await expect(assignmentTrigger(page).first()).toHaveText(account, { timeout: BOOKS_TIMEOUT })
}

/** Drop the assignment so journal assembly restores the inferred counter-account. */
export async function revertWithdrawalAccount(page: Page): Promise<void> {
  await assignmentTrigger(page).first().click()
  await page.locator('[data-test="ledger-account-assignment-clear"]').click()
  await expect(page.getByText('Reverted to the inferred account', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  await expect(assignmentTrigger(page).first()).toHaveText('Inferred account', {
    timeout: BOOKS_TIMEOUT
  })
}

/** What the Account Assignments page reports for the first eligible withdrawal. */
export async function readAssignmentDecision(page: Page): Promise<string> {
  const editor = assignmentTrigger(page).first()
  if (await editor.isVisible().catch(() => false)) {
    return (await editor.textContent())?.trim() ?? ''
  }
  const row = page.locator('[data-test="account-assignment-table"] tbody tr').first()
  return (await row.textContent())?.trim() ?? ''
}

/** Whether the current viewer is offered the assignment editor at all. */
export async function canEditAssignments(page: Page): Promise<boolean> {
  return (await assignmentTrigger(page).count()) > 0
}
