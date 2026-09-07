import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import SummaryView from '../SummaryView.vue'
import IncomeStatementView from '../IncomeStatementView.vue'
import BalanceSheetView from '../BalanceSheetView.vue'
import TrialBalanceView from '../TrialBalanceView.vue'
import GeneralLedgerView from '../GeneralLedgerView.vue'
import ClassificationView from '../ClassificationView.vue'
import AccountingSummary from '@/components/sections/AccountingView/AccountingSummary.vue'
import IncomeStatementCard from '@/components/sections/AccountingView/IncomeStatementCard.vue'
import BalanceSheetCard from '@/components/sections/AccountingView/BalanceSheetCard.vue'
import TrialBalanceCard from '@/components/sections/AccountingView/TrialBalanceCard.vue'
import GeneralLedger from '@/components/sections/AccountingView/GeneralLedger.vue'
import ClassificationTable from '@/components/sections/AccountingView/ClassificationTable.vue'

// AccountingPage owns the shared route context. These leaf views render only
// their report so navigation can replace them without remounting that owner.

describe('SummaryView', () => {
  it('renders the summary section', () => {
    const wrapper = shallowMount(SummaryView)
    expect(wrapper.findComponent(AccountingSummary).exists()).toBe(true)
  })
})

describe('IncomeStatementView', () => {
  it('renders the income statement', () => {
    const wrapper = shallowMount(IncomeStatementView)
    expect(wrapper.findComponent(IncomeStatementCard).exists()).toBe(true)
  })
})

describe('BalanceSheetView', () => {
  it('renders the balance sheet', () => {
    const wrapper = shallowMount(BalanceSheetView)
    expect(wrapper.findComponent(BalanceSheetCard).exists()).toBe(true)
  })
})

describe('TrialBalanceView', () => {
  it('renders the trial balance', () => {
    const wrapper = shallowMount(TrialBalanceView)
    expect(wrapper.findComponent(TrialBalanceCard).exists()).toBe(true)
  })
})

describe('GeneralLedgerView', () => {
  it('renders the ledger', () => {
    const wrapper = shallowMount(GeneralLedgerView)
    expect(wrapper.findComponent(GeneralLedger).exists()).toBe(true)
  })
})

describe('ClassificationView', () => {
  it('renders the classification table', () => {
    const wrapper = shallowMount(ClassificationView)
    expect(wrapper.findComponent(ClassificationTable).exists()).toBe(true)
  })
})
