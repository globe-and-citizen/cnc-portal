import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import AccountingPage from '../AccountingPage.vue'

describe('AccountingPage', () => {
  it('renders the shared Accounting shell and its nested route outlet', () => {
    const wrapper = renderWithProviders(AccountingPage)

    expect(wrapper.text()).toContain('Accounting')
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="accounting-error"]').exists()).toBe(false)
  })
})
