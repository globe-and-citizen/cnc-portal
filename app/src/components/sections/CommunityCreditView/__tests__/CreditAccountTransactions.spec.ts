import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { Address } from 'viem'
import CreditAccountTransactions from '../CreditAccountTransactions.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import {
  createMockEventFeedState,
  makeCurrencyStoreMock,
  resetMockEventFeedState
} from '@/tests/mocks'

const mockCreditQuery = createMockEventFeedState()

vi.mock('@/composables/fixedReturn/useFixedReturnEventsViaLogs', () => ({
  useFixedReturnEventsViaLogs: () => mockCreditQuery
}))

const mockCurrencyStore = makeCurrencyStoreMock()
const CREDIT_ADDRESS = '0x1111111111111111111111111111111111111111' as Address

const UAlertStub = defineComponent({
  name: 'UAlert',
  props: ['title', 'description'],
  template:
    '<div v-bind="$attrs"><strong>{{ title }}</strong><span>{{ description }}</span><slot name="actions" /></div>'
})

const UTableStub = defineComponent({
  name: 'UTable',
  props: ['data', 'columns', 'loading', 'getSubRows'],
  template: '<div data-test="credit-table" />'
})

const UCardStub = defineComponent({
  name: 'UCard',
  template: '<div><slot name="header" /><slot /><slot name="footer" /></div>'
})

const USelectStub = defineComponent({
  name: 'USelect',
  props: ['modelValue', 'items'],
  template: '<div data-test="credit-type-filter" />'
})

const DatePickerStub = defineComponent({
  name: 'DatePicker',
  props: ['modelValue', 'mode', 'storageKey'],
  template: '<div data-test="credit-date-filter" />'
})

const UBadgeStub = defineComponent({
  name: 'UBadge',
  template: '<span><slot /></span>'
})

const UserIdentityStub = defineComponent({
  name: 'UserIdentity',
  props: ['user'],
  template: '<span />'
})

const UTooltipStub = defineComponent({
  name: 'UTooltip',
  template: '<span><slot /></span>'
})

const TablePaginationStub = defineComponent({
  name: 'TablePagination',
  template: '<div />'
})

const TransactionDetailSlideoverStub = defineComponent({
  name: 'TransactionDetailSlideover',
  template: '<div />'
})

const createWrapper = (): VueWrapper =>
  mount(CreditAccountTransactions, {
    props: { fixedReturnAddress: CREDIT_ADDRESS },
    global: {
      stubs: {
        UAlert: UAlertStub,
        UBadge: UBadgeStub,
        UCard: UCardStub,
        USelect: USelectStub,
        UTable: UTableStub,
        UTooltip: UTooltipStub,
        DatePicker: DatePickerStub,
        UserIdentity: UserIdentityStub,
        TablePagination: TablePaginationStub,
        TransactionDetailSlideover: TransactionDetailSlideoverStub
      }
    }
  })

describe('CreditAccountTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCurrencyStore).mockReturnValue(
      mockCurrencyStore as unknown as ReturnType<typeof useCurrencyStore>
    )
    resetMockEventFeedState(mockCreditQuery, {
      fixedReturnLendingOfferCreateds: { items: [] },
      fixedReturnFundsLents: { items: [] },
      fixedReturnLenderRepaids: { items: [] },
      fixedReturnLendingOfferFundeds: { items: [] },
      fixedReturnLendingOfferRefundables: { items: [] },
      fixedReturnPartialFundingAccepteds: { items: [] },
      fixedReturnPrincipalRefundeds: { items: [] },
      fixedReturnRefundsDistributeds: { items: [] },
      fixedReturnRepaymentDistributeds: { items: [] },
      fixedReturnOwnershipTransferreds: { items: [] },
      fixedReturnTokenSupportAddeds: { items: [] },
      fixedReturnTokenSupportRemoveds: { items: [] }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('shows an unavailable-history warning when the feed has no usable data', () => {
    mockCreditQuery.data.value = undefined
    mockCreditQuery.error.value = new Error('RPC unavailable')

    wrapper = createWrapper()

    expect(wrapper.get('[data-test="credit-transaction-history-status"]').text()).toContain(
      'Transaction history unavailable'
    )
  })

  it('retries the feed from the unavailable-history warning', async () => {
    mockCreditQuery.data.value = undefined
    mockCreditQuery.error.value = new Error('RPC unavailable')

    wrapper = createWrapper()
    await wrapper.get('[data-test="credit-transaction-history-status-retry"]').trigger('click')

    expect(mockCreditQuery.refetch).toHaveBeenCalledTimes(1)
  })
})
