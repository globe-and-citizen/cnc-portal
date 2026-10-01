// Read an Accounting export back. The portal builds the workbook in the browser
// and hands it to the download pipeline, so the file the company receives is the
// only honest evidence that an export carries the reviewed state.
import { readFile } from 'node:fs/promises'
import { expect, type Page } from '@playwright/test'
import xlsx from 'xlsx-js-style'
import type { SectionKey } from '../../../src/utils/accounting/exportSpec'

/** SheetJS ships CommonJS, so its helpers arrive on the default export. */
const { read, utils } = xlsx

/** One worksheet as a plain grid, matching the cells the exporter wrote. */
export type SheetRows = (string | number)[][]

export interface Workbook {
  filename: string
  sheets: Record<string, SheetRows>
}

/** Run an export action and parse the workbook it downloads. */
export async function downloadWorkbook(page: Page, run: () => Promise<void>): Promise<Workbook> {
  const pending = page.waitForEvent('download', { timeout: 60_000 })
  await run()
  const download = await pending
  const path = await download.path()
  if (!path) throw new Error('The accounting export produced no file')
  const workbook = read(await readFile(path), { type: 'buffer' })
  const sheets: Record<string, SheetRows> = {}
  for (const name of workbook.SheetNames) {
    sheets[name] = utils.sheet_to_json<(string | number)[]>(workbook.Sheets[name]!, {
      header: 1,
      blankrows: true,
      defval: ''
    })
  }
  return { filename: download.suggestedFilename(), sheets }
}

/** Export the report currently on screen through its own export bar. */
export async function exportCurrentReport(page: Page): Promise<Workbook> {
  return downloadWorkbook(page, async () => {
    await page.locator('[data-test="export-excel"]').click()
  })
}

/** Export several chosen sections from the Summary report modal. */
export async function exportSelectedSections(
  page: Page,
  sections: readonly SectionKey[]
): Promise<Workbook> {
  await page.locator('[data-test="open-export-report"]').click()
  await page.locator('[data-test="deselect-all"]').click()
  for (const section of sections) {
    await page.locator(`[data-test="section-${section}"]`).getByRole('checkbox').click()
  }
  return downloadWorkbook(page, async () => {
    await page.locator('[data-test="generate-excel"]').click()
  })
}

/** The row index of the first row whose first cell equals `label`. */
export function rowIndexOf(rows: SheetRows, label: string): number {
  return rows.findIndex((row) => String(row[0] ?? '').trim() === label)
}

/** The row whose first cell equals `label`, or a readable failure. */
export function sheetRow(rows: SheetRows, label: string): (string | number)[] {
  const index = rowIndexOf(rows, label)
  expect(index, `Expected an exported row labelled "${label}"`).toBeGreaterThanOrEqual(0)
  return rows[index]!
}

/** The exported General Ledger data rows, between the header and the total row. */
export function ledgerDataRows(rows: SheetRows): SheetRows {
  const header = rowIndexOf(rows, 'Date')
  expect(header, 'Expected the exported ledger to carry its column header').toBeGreaterThanOrEqual(
    0
  )
  const body = rows.slice(header + 1)
  const footer = body.findIndex((row) => row.includes('Total movements'))
  expect(footer, 'Expected the exported ledger to carry its total row').toBeGreaterThanOrEqual(0)
  return body.slice(0, footer)
}

/** The exported General Ledger total row. */
export function ledgerTotalRow(rows: SheetRows): (string | number)[] {
  const row = rows.find((candidate) => candidate.includes('Total movements'))
  expect(row, 'Expected the exported ledger to carry its total row').toBeTruthy()
  return row!
}
