import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'
import LedgerPrecisionCell from '../LedgerPrecisionCell.vue'
import LedgerTable from '../LedgerTable.vue'
import { journalLedgerRows } from '@/utils/accounting/journalLedgerPresenter'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'

function renderQuantity() {
  return renderWithProviders(LedgerPrecisionCell, {
    props: {
      value: '0.000382',
      label: 'Exact quantity',
      detail: '0.000381862376267664 WETH'
    }
  })
}

describe('Ledger precision details', () => {
  it('provides the complete quantity to the hover tooltip and accessible button', () => {
    const wrapper = renderQuantity()
    const tooltip = wrapper.findComponent({ name: 'UTooltip' })
    const button = wrapper.get('[data-test="ledger-precision-value"]')

    expect(button.text()).toBe('0.000382')
    expect(button.attributes('aria-label')).toBe('Exact quantity: 0.000381862376267664 WETH')
    expect(tooltip.props('text')).toBe(button.attributes('aria-label'))
    expect(tooltip.attributes('disable-closing-trigger')).toBe('true')
    wrapper.unmount()
  })

  it('opens details on keyboard focus and closes them on Escape or blur', async () => {
    const wrapper = renderQuantity()
    const tooltip = wrapper.findComponent({ name: 'UTooltip' })
    const button = wrapper.get('[data-test="ledger-precision-value"]')

    await button.trigger('focus')
    expect(tooltip.attributes('open')).toBe('true')
    await button.trigger('keydown', { key: 'Escape' })
    expect(tooltip.attributes('open')).toBe('false')
    await button.trigger('focus')
    await button.trigger('blur')
    expect(tooltip.attributes('open')).toBe('false')
    wrapper.unmount()
  })

  it('opens the same details on a tap-generated click', async () => {
    const wrapper = renderQuantity()
    await wrapper.get('[data-test="ledger-precision-value"]').trigger('click')
    expect(wrapper.findComponent({ name: 'UTooltip' }).attributes('open')).toBe('true')
    wrapper.unmount()
  })

  it('leaves unavailable and empty movements as plain text', () => {
    for (const value of ['Unavailable', '']) {
      const wrapper = renderWithProviders(LedgerPrecisionCell, {
        props: { value, label: 'Exact quantity' }
      })
      expect(wrapper.find('[data-test="ledger-precision-value"]').exists()).toBe(false)
      expect(wrapper.text()).toBe(value)
      wrapper.unmount()
    }
  })

  it('[AC-US-ACCT-002-04] displays compact quantities and recorded rates with complete inspection values', async () => {
    const journal = finalizeJournal([
      {
        id: 'fractional-token',
        timestamp: 100,
        useCase: 'CASH-IN',
        debit: 'Cash — Bank',
        credit: 'Service Revenue',
        token: 'native',
        rawAmount: '286595379927822735',
        rate: 1.000034,
        internal: false,
        memo: '',
        enrichment: 'not-applicable'
      }
    ])
    const rows = journalLedgerRows(journal)
    const wrapper = renderWithProviders(LedgerTable, {
      props: { rows, total: '$0.29' }
    })
    await flushPromises()
    const cells = wrapper.findAll('[data-test="ledger-precision-value"]')

    expect(cells.map((cell) => cell.text())).toEqual([
      '0.286595',
      '$1.000034',
      '0.286595',
      '$1.000034'
    ])
    expect(cells[0]!.attributes('aria-label')).toBe(
      `Exact quantity: 0.286595379927822735 ${rows[0]!.currency}`
    )
    expect(cells[1]!.attributes('aria-label')).toBe(
      `Recorded rate: $1.000034 / ${rows[0]!.currency}`
    )
    expect(wrapper.text()).toContain('$0.29')
    wrapper.unmount()
  })
})
