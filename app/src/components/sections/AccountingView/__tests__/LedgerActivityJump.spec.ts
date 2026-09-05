/**
 * Clicking an Activity opens the section the posting happened in.
 *
 * The "where" itself is mapped in `activityDestination.spec.ts` and turned into a
 * route in `useActivityDestination.spec.ts`; here we only check that the ledger
 * table wires the two together — a linkable posting is a real hit target, one
 * without a surface stays plain text, and a continuation row never links.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders, mockRouterPush } from '@/tests/mocks'
import LedgerTable from '../LedgerTable.vue'
import { journalLedgerRows } from '@/utils/accounting/journalLedgerPresenter'
import { buildJournal } from '@/utils/accounting/generalLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const MEMBER = '0x1111111111111111111111111111111111111111'

/** A minimal balanced entry; override only what each case needs. */
function entry(partial: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: 'e1',
    timestamp: 1_700_000_000,
    useCase: 'CASH-IN',
    debit: 'Cash — Bank',
    credit: 'Service Revenue',
    amountUsd: 500,
    token: 'usdc',
    rawAmount: '500000000',
    internal: false,
    memo: 'raw memo',
    enrichment: 'not-applicable',
    ...partial
  }
}

function renderLedger(entries: LedgerEntry[]) {
  return renderWithProviders(LedgerTable, {
    props: { rows: journalLedgerRows(buildJournal(entries)), total: '$500.00' },
    route: { params: { id: '42' } }
  })
}

describe('General ledger — jumping from an Activity to its section', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
  })

  it('opens the expense account when an expense Activity is clicked', async () => {
    const wrapper = renderLedger([
      entry({ useCase: 'UC-EXP-01', debit: 'Operating Expense', credit: 'Cash — Expense' })
    ])
    await flushPromises()

    const link = wrapper.find('[data-test="activity-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('title')).toBe('Open the Expense Account')

    await link.trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'expense-account',
      params: { id: '42' }
    })
    wrapper.unmount()
  })

  it("scopes a wage to the member's own payroll history", async () => {
    const wrapper = renderLedger([
      entry({
        useCase: 'UC-CASH-03',
        counterparty: MEMBER,
        debit: 'Wage Payable',
        credit: 'Cash — Payroll'
      })
    ])
    await flushPromises()

    await wrapper.find('[data-test="activity-link"]').trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'payroll-history',
      params: { id: '42', memberAddress: MEMBER }
    })
    wrapper.unmount()
  })

  it('leaves an Activity with no section as plain, unclickable text', async () => {
    const wrapper = renderLedger([
      entry({ useCase: 'CASH-IN', debit: 'Retained Earnings', credit: 'Service Revenue' })
    ])
    await flushPromises()

    expect(wrapper.find('[data-test="activity-link"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="activity-text"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('links once per posting — the credit line carries no Activity of its own', async () => {
    const wrapper = renderLedger([
      entry({ useCase: 'UC-EXP-01', debit: 'Operating Expense', credit: 'Cash — Expense' })
    ])
    await flushPromises()
    expect(wrapper.findAll('[data-test="activity-link"]')).toHaveLength(1)
    wrapper.unmount()
  })
})
