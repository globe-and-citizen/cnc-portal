import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import BalanceSheetTable from '../BalanceSheetTable.vue'
import { accountFor } from '@/utils/accounting/accountRegistry'
import type { BalanceLineView } from '@/utils/accounting/presenter'

describe('BalanceSheetTable', () => {
  it('opens the concrete account represented by its selected row', async () => {
    const line: BalanceLineView = {
      label: 'Cash — Bank',
      value: '$2.00',
      account: accountFor('Cash — Bank'),
      nature: 'Asset',
      natureClass: 'text-info'
    }
    const wrapper = renderWithProviders(BalanceSheetTable, {
      props: {
        title: 'Assets',
        rows: [line],
        totalLabel: 'Total assets',
        total: '$2.00',
        dataTest: 'balance-test'
      }
    })

    await wrapper.find('[data-test^="balance-test-drilldown-"]').trigger('click')

    expect(wrapper.emitted('drilldown')).toEqual([[line]])
    wrapper.unmount()
  })

  it('labels signed earnings rows as contributions when requested', () => {
    const wrapper = renderWithProviders(BalanceSheetTable, {
      props: {
        title: 'Earnings to date calculation',
        rows: [],
        totalLabel: 'Earnings to date',
        total: '$0.00',
        dataTest: 'balance-earnings',
        valueLabel: 'Contribution'
      }
    })

    expect(wrapper.text()).toContain('Contribution')
    wrapper.unmount()
  })
})
