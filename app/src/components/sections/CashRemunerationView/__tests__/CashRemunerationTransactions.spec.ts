import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import CashRemunerationTransactions from '../CashRemunerationTransactions.vue'
import { mockUseApolloQuery } from '@/tests/mocks/composables.mock'
import { mockLog } from '@/tests/mocks/utils.mock'
import * as stores from '@/stores'
import * as utils from '@/utils'

const GenericTransactionHistoryStub = defineComponent({
  name: 'GenericTransactionHistory',
  props: {
    transactions: { type: Array, required: false },
    title: { type: String, required: false },
    currencies: { type: Array, required: false },
    showReceiptModal: { type: Boolean, required: false }
  },
  template: '<div data-test="history-stub" />'
})

describe('CashRemunerationTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApolloQuery.result.value = {
      transactions: [
        {
          transactionHash: '0xhash1',
          blockTimestamp: '1704067200',
          from: '0xfrom',
          to: '0xto',
          amount: '1000000000000000000',
          tokenAddress: null,
          transactionType: 'withdraw'
        }
      ]
    }
    mockUseApolloQuery.error.value = null

    vi.spyOn(utils, 'formatEtherUtil').mockReturnValue('1.0')
    vi.spyOn(utils, 'tokenSymbol').mockReturnValue('ETH')
    vi.spyOn(stores, 'useCurrencyStore').mockReturnValue({
      localCurrency: { code: 'USD' }
    } as unknown as ReturnType<typeof stores.useCurrencyStore>)
  })

  const createWrapper = () =>
    shallowMount(CashRemunerationTransactions, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          GenericTransactionHistory: GenericTransactionHistoryStub
        }
      }
    })

  it('maps transactions and passes props to GenericTransactionHistory', () => {
    const wrapper = createWrapper()
    const history = wrapper.findComponent(GenericTransactionHistoryStub)

    expect(history.exists()).toBe(true)
    expect(history.props('title')).toBe('Cash Remuneration Transactions History')
    expect(history.props('showReceiptModal')).toBe(true)
    expect(history.props('currencies')).toEqual(['USD'])
    expect(history.props('transactions')).toEqual([
      expect.objectContaining({
        txHash: '0xhash1',
        from: '0xfrom',
        to: '0xto',
        amount: '1.0',
        token: 'ETH',
        type: 'withdraw'
      })
    ])
  })

  it('adds local currency when it is not USD', () => {
    vi.spyOn(stores, 'useCurrencyStore').mockReturnValue({
      localCurrency: { code: 'EUR' }
    } as unknown as ReturnType<typeof stores.useCurrencyStore>)

    const wrapper = createWrapper()
    const history = wrapper.findComponent(GenericTransactionHistoryStub)
    expect(history.props('currencies')).toEqual(['USD', 'EUR'])
  })

  it('logs when apollo query returns an error', async () => {
    createWrapper()

    mockUseApolloQuery.error.value = new Error('Apollo error')
    await nextTick()

    expect(mockLog.error).toHaveBeenCalledWith('useQueryError: ', expect.any(Error))
  })
})
