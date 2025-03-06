import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionsHistorySection from '../TransactionsHistorySection.vue'

describe('TransactionsHistorySection', () => {
  const defaultProps = {
    currencyRates: {
      loading: false,
      error: null,
      getRate: () => 1
    }
  }

  it('renders GenericTransactionHistory with correct props', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: defaultProps,
      global: {
        stubs: {
          GenericTransactionHistory: true
        }
      }
    })

    const genericHistory = wrapper.findComponent({ name: 'GenericTransactionHistory' })
    expect(genericHistory.exists()).toBe(true)
    expect(genericHistory.props()).toMatchObject({
      title: 'Bank Transactions History',
      currencies: ['USD', 'CAD', 'INR', 'EUR'],
      showReceiptModal: true,
      currencyRates: defaultProps.currencyRates
    })
  })

  it('passes data-test attribute correctly', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: defaultProps,
      global: {
        stubs: {
          GenericTransactionHistory: true
        }
      }
    })

    const component = wrapper.find('[data-test="bank-transactions"]')
    expect(component.exists()).toBe(true)
  })

  it('handles currency rates props correctly', () => {
    const customRates = {
      loading: true,
      error: 'Test error',
      getRate: (currency: string) => (currency === 'USD' ? 1 : 1.5)
    }

    const wrapper = mount(TransactionsHistorySection, {
      props: {
        currencyRates: customRates
      },
      global: {
        stubs: {
          GenericTransactionHistory: true
        }
      }
    })

    const genericHistory = wrapper.findComponent({ name: 'GenericTransactionHistory' })
    expect(genericHistory.props('currencyRates')).toEqual(customRates)
  })
})
