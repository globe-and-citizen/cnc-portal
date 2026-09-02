import { describe, it, expect } from 'vitest'
import { ledgerRows, presentLedger } from '../ledgerPresenter'
import { presentAccountLedger } from '../accountLedger'
import { buildPocketInstances } from '../pocketInstances'
import type { LedgerEntry } from '../ledgerEntry'

const BANK_1 = '0x1111111111111111111111111111111111111111'
const BANK_2 = '0x2222222222222222222222222222222222222222'
const PAYROLL = '0x3333333333333333333333333333333333333333'

/** A deposit into one Bank contract at a given time. */
function deposit(id: string, instance: string, timestamp: number): LedgerEntry {
  return {
    id,
    timestamp,
    useCase: 'UC-BANK-02',
    debit: 'Cash — Bank',
    debitInstance: instance as `0x${string}`,
    credit: 'Service Revenue',
    amountUsd: 100,
    token: 'usdc',
    rawAmount: '100000000',
    internal: false,
    memo: '',
    enrichment: 'not-applicable'
  }
}

/** The two Bank deployments of a redeployed team, oldest first. */
const REDEPLOYED = [deposit('a', BANK_1, 1_700_000_000), deposit('b', BANK_2, 1_700_086_400)]

describe('general ledger — redeployed pocket labelling', () => {
  it('names the later deployment on its own postings, keeping the account itself', () => {
    const rows = ledgerRows(REDEPLOYED, buildPocketInstances(REDEPLOYED))
    const bankRows = rows.filter((r) => r.account === 'Cash — Bank')
    expect(bankRows).toHaveLength(2)

    // Rows follow the feed: the original deployment keeps the plain name.
    expect(bankRows[0].accountLabel).toBe('Cash — Bank')
    expect(bankRows[0].accountInstance).toBe(BANK_1)
    expect(bankRows[0].instanceNumber).toBe(1)
    // The redeployed contract's own posting is numbered.
    expect(bankRows[1].accountLabel).toBe('Cash — Bank 2')
    expect(bankRows[1].accountInstance).toBe(BANK_2)
    expect(bankRows[1].instanceNumber).toBe(2)
    // The account itself never changes — the filters and the trial-balance jump
    // keep reading it.
    expect(bankRows.every((r) => r.account === 'Cash — Bank')).toBe(true)
  })

  it('leaves the rows plain when no deployment index is given', () => {
    const rows = ledgerRows(REDEPLOYED)
    expect(rows.every((r) => r.accountLabel === undefined)).toBe(true)
    expect(rows.every((r) => r.instanceNumber === undefined)).toBe(true)
  })

  it('leaves an un-redeployed book exactly as before', () => {
    const single = [deposit('a', BANK_1, 1_700_000_000)]
    const rows = ledgerRows(single, buildPocketInstances(single))
    expect(rows.find((r) => r.account === 'Cash — Bank')?.accountLabel).toBeUndefined()
  })

  it('names both legs of a transfer between two pockets', () => {
    const transfer: LedgerEntry = {
      id: 't',
      timestamp: 1_700_100_000,
      useCase: 'UC-BANK-03',
      debit: 'Cash — Payroll',
      debitInstance: PAYROLL as `0x${string}`,
      credit: 'Cash — Bank',
      creditInstance: BANK_2 as `0x${string}`,
      amountUsd: 40,
      token: 'usdc',
      rawAmount: '40000000',
      internal: true,
      memo: '',
      enrichment: 'not-applicable'
    }
    const entries = [...REDEPLOYED, transfer]
    const rows = ledgerRows(entries, buildPocketInstances(entries))
    // Payroll was never redeployed, so it stays plain; the Bank leg is numbered.
    expect(rows.find((r) => r.account === 'Cash — Payroll')?.accountLabel).toBeUndefined()
    expect(rows.find((r) => r.cr && r.account === 'Cash — Bank')?.accountLabel).toBe(
      'Cash — Bank 2'
    )
  })

  it('numbers off the whole book, not the filtered slice', () => {
    // A window holding only the post-redeploy posting still reads "Cash — Bank 2":
    // the deployment keeps the number the trial balance gave it.
    const from = new Date(1_700_086_400 * 1000)
    const view = presentLedger(REDEPLOYED, 'All', from, null)
    expect(view.entryCount).toBe(1)
    expect(view.rows.find((r) => r.account === 'Cash — Bank')?.accountLabel).toBe('Cash — Bank 2')
  })

  it('keeps the numbering in a drill-down scoped to one deployment', () => {
    const view = presentAccountLedger(REDEPLOYED, 'Cash — Bank', null, null, undefined, {
      instance: BANK_2
    })
    expect(view.entryCount).toBe(1)
    expect(view.rows.find((r) => r.account === 'Cash — Bank')?.accountLabel).toBe('Cash — Bank 2')
  })
})
