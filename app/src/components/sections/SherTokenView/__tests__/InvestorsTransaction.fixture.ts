import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import InvestorsTransactions from '../InvestorsTransactions.vue'

export const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
export const INVESTOR_ADDRESS = '0x1111111111111111111111111111111111111111'
export const SAFE_ROUTER_ADDRESS = '0x2222222222222222222222222222222222222222'
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const UCardStub = defineComponent({
  name: 'UCard',
  template: '<div><slot name="header" /><slot /></div>'
})

const UTableStub = defineComponent({
  name: 'UTable',
  props: {
    data: { type: Array, required: false },
    columns: { type: Array, required: false },
    loading: { type: Boolean, required: false }
  },
  template: '<div data-test="investor-table"></div>'
})

const USelectStub = defineComponent({
  name: 'USelect',
  props: {
    modelValue: { type: String, required: false },
    items: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="investor-type-filter"></div>'
})

const CustomDatePickerStub = defineComponent({
  name: 'CustomDatePicker',
  props: {
    modelValue: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="investor-date-filter"></div>'
})

const AddressToolTipStub = defineComponent({
  name: 'AddressToolTip',
  template: '<div />'
})

const UBadgeStub = defineComponent({
  name: 'UBadge',
  template: '<span><slot /></span>'
})

export const buildInvestorResult = () => ({
  investorMints: {
    items: [
      {
        id: '0xminttx-0',
        contractAddress: INVESTOR_ADDRESS,
        shareholder: '0x3333333333333333333333333333333333333333',
        amount: '1000000',
        timestamp: 1_700_000_000
      }
    ]
  },
  investorDividendDistributeds: { items: [] },
  investorDividendPaids: { items: [] },
  investorDividendPaymentFaileds: { items: [] }
})

export const buildSafeResult = () => ({
  safeDeposits: {
    items: [
      {
        id: '0xsafedeposit-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        depositor: '0x4444444444444444444444444444444444444444',
        token: USDC_ADDRESS,
        tokenAmount: '5000000',
        sherAmount: '0',
        timestamp: 1_700_000_100
      }
    ]
  },
  safeDepositsEnableds: { items: [] },
  safeDepositsDisableds: { items: [] },
  safeAddressUpdateds: { items: [] },
  safeMultiplierUpdateds: {
    items: [
      {
        id: '0xmultiplier-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        oldMultiplier: '1000000',
        newMultiplier: '1500000',
        timestamp: 1_700_000_200
      }
    ]
  }
})

export const createWrapper = (): VueWrapper =>
  mount(InvestorsTransactions, {
    global: {
      stubs: {
        UCard: UCardStub,
        'u-card': UCardStub,
        UTable: UTableStub,
        'u-table': UTableStub,
        USelect: USelectStub,
        'u-select': USelectStub,
        UBadge: UBadgeStub,
        'u-badge': UBadgeStub,
        AddressToolTip: AddressToolTipStub,
        'address-tool-tip': AddressToolTipStub,
        CustomDatePicker: CustomDatePickerStub,
        'custom-date-picker': CustomDatePickerStub
      }
    }
  })
