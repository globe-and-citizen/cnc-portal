import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'
import BalanceSheetView from '../BalanceSheetView.vue'
import BalanceSheetTable from '@/components/sections/AccountingView/BalanceSheetTable.vue'
import LedgerDrilldownModal from '@/components/sections/AccountingView/LedgerDrilldownModal.vue'
import { entriesForAccount } from '@/utils/accounting/accountLedger'
import { catalogueLedger } from '@/utils/accounting/__tests__/catalogueLedger'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import type { StatementLineView } from '@/utils/accounting/presenter'
import type { JournalEntry } from '@/utils/accounting/types'

const accountingContext = vi.hoisted(() => ({ journal: { value: [] as JournalEntry[] } }))
vi.mock('@/composables/accounting/useAccountingContext', () => ({
  useAccountingContext: () => accountingContext
}))
vi.mock('@/composables/accounting/useAccountingExport', () => ({
  useAccountingExport: () => ({ exportPdf: vi.fn(), exportExcel: vi.fn() })
}))

beforeEach(() => {
  accountingContext.journal.value = finalizeJournal(catalogueLedger)
  localStorage.clear()
})

describe('Balance Sheet drill-down interactions', () => {
  it.each(['button', 'details', 'row'])(
    '[AC-US-ACCT-003-08] opens only the selected Bank account through its %s',
    async (target) => {
      const accounts = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        undefined
      ]
      const journal = finalizeJournal(
        accounts.map((debitInstance, index) => ({
          ...catalogueLedger[0]!,
          id: `bank-${index}`,
          debit: 'Cash — Bank' as const,
          credit: 'Owner Capital' as const,
          debitInstance,
          token: 'usdc' as const,
          rawAmount: String((index + 1) * 10_000_000),
          rate: 1
        }))
      )
      accountingContext.journal.value = journal
      const wrapper = renderWithProviders(BalanceSheetView)
      const table = wrapper.findComponent(BalanceSheetTable)
      const lines = table.props('rows')
      expect(lines).toHaveLength(3)

      for (const line of lines) {
        const account = line.account
        const button = table.get(`[data-test="balance-assets-drilldown-${account.id}"]`)
        if (target === 'details') {
          await table.get(`[data-test="balance-assets-details-${account.id}"]`).trigger('click')
        } else if (target === 'row') {
          button.element.closest('tr')!.click()
        } else {
          await button.trigger('click')
        }
        await flushPromises()

        const modal = wrapper.findComponent(LedgerDrilldownModal)
        expect(modal.props('open')).toBe(true)
        expect(modal.props('account')).toBe(line.label)
        expect(modal.props('entries')).toEqual(entriesForAccount(journal, account))
        expect(modal.props('entries')).toHaveLength(1)
        expect(modal.props('total')).toBe(line.value)
        expect(modal.props('balance').account.id).toBe(account.id)
        modal.vm.$emit('update:open', false)
        await flushPromises()
      }
      wrapper.unmount()
    }
  )

  it('[AC-US-ACCT-003-04] opens the earnings aggregate with its contributing journal entries', async () => {
    const wrapper = renderWithProviders(BalanceSheetView)
    const table = wrapper.findAllComponents(BalanceSheetTable)[2]!
    const line = table.props('rows').find((candidate: StatementLineView) => candidate.accounts)
    expect(line.accounts.length).toBeGreaterThan(0)
    await table.get('[data-test="balance-equity-details-earnings-to-date"]').trigger('click')
    await flushPromises()

    const modal = wrapper.findComponent(LedgerDrilldownModal)
    expect(modal.props('open')).toBe(true)
    expect(modal.props('account')).toBe('Earnings to date')
    expect(modal.props('total')).toBe(line.value)
    expect(modal.props('entries')).toEqual(
      entriesForAccount(accountingContext.journal.value as JournalEntry[], line.accounts)
    )
    expect(modal.props('balance').account).toBeNull()
    wrapper.unmount()
  })
})
