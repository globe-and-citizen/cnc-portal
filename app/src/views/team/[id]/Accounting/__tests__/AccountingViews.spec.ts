import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import SummaryView from '../SummaryView.vue'
import IncomeStatementView from '../IncomeStatementView.vue'
import BalanceSheetView from '../BalanceSheetView.vue'
import TrialBalanceView from '../TrialBalanceView.vue'
import GeneralLedgerView from '../GeneralLedgerView.vue'

// Each accounting page is a thin view wrapping its section card in the shared
// `AccountingPage` shell (header + error banner + one `provideAccounting` per
// page). The books resolve through the globally-mocked queries; the numeric
// mapping is covered by `presenter.spec.ts` and the card internals by
// `AccountingView.spec.ts` — here we assert each page mounts its shell and
// section without error.

describe('SummaryView', () => {
  it('renders the shell header and the summary section', () => {
    const wrapper = renderWithProviders(SummaryView)
    expect(wrapper.text()).toContain('Accounting')
    expect(wrapper.find('[data-test="balance-banner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="accounting-error"]').exists()).toBe(false)
  })
})

describe('IncomeStatementView', () => {
  it('renders the shell header and the income statement', () => {
    const wrapper = renderWithProviders(IncomeStatementView)
    expect(wrapper.text()).toContain('Accounting')
    expect(wrapper.text()).toContain('Income statement')
  })
})

describe('BalanceSheetView', () => {
  it('renders the shell header and the balance sheet', () => {
    const wrapper = renderWithProviders(BalanceSheetView)
    expect(wrapper.text()).toContain('Accounting')
    expect(wrapper.text()).toContain('Balance sheet')
  })
})

describe('TrialBalanceView', () => {
  it('renders the shell header and the trial balance', () => {
    const wrapper = renderWithProviders(TrialBalanceView)
    expect(wrapper.text()).toContain('Accounting')
    expect(wrapper.text()).toContain('Trial balance')
  })
})

describe('GeneralLedgerView', () => {
  it('renders the shell header and the ledger', () => {
    const wrapper = renderWithProviders(GeneralLedgerView)
    expect(wrapper.text()).toContain('Accounting')
    expect(wrapper.text()).toContain('Total movements')
  })
})
