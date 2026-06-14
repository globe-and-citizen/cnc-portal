import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { Address } from 'viem'

import CashRemunerationTransactions from '../CashRemunerationTransactions.vue'

export type CRRow = {
  type: string
  txHash: string
  amount: string | number
  amountLocal: number
  token: string
}
type Column = { header: string }

export const tableData = (wrapper: VueWrapper) =>
  wrapper.findComponent({ name: 'UTable' }).props('data') as CRRow[]
export const tableColumns = (wrapper: VueWrapper) =>
  wrapper.findComponent({ name: 'UTable' }).props('columns') as Column[]
export const tableLoading = (wrapper: VueWrapper) =>
  wrapper.findComponent({ name: 'UTable' }).props('loading') as boolean

const UCardStub = defineComponent({
  name: 'UCard',
  template: '<div><slot name="header" /><slot /></div>'
})

const UTableStub = defineComponent({
  name: 'UTable',
  props: {
    data: { type: Array, required: false },
    columns: { type: Array, required: false },
    loading: { type: Boolean, required: false },
    getSubRows: { type: Function, required: false }
  },
  methods: {
    rowContext(original: CRRow, depth: number) {
      return {
        original,
        depth
      }
    }
  },
  template: `
    <div data-test="cash-remuneration-table">
      <div v-for="(row, index) in data || []" :key="index" data-test="cash-remuneration-rendered-row">
        <slot name="type-cell" :row="rowContext(row, 0)" />
        <slot name="counterparty-cell" :row="rowContext(row, 0)" />
        <slot name="value-cell" :row="rowContext(row, 0)" />
      </div>
    </div>
  `
})

const USelectStub = defineComponent({
  name: 'USelect',
  props: {
    modelValue: { type: String, required: false },
    items: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="type-filter"></div>'
})

const CustomDatePickerStub = defineComponent({
  name: 'CustomDatePicker',
  props: {
    modelValue: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="date-filter"></div>'
})

const AddressToolTipStub = defineComponent({
  name: 'AddressToolTip',
  template: '<div />'
})

const UBadgeStub = defineComponent({
  name: 'UBadge',
  template: '<span><slot /></span>'
})

const UserComponentStub = defineComponent({
  name: 'UserComponent',
  props: {
    user: { type: Object, required: false }
  },
  template: '<span data-test="cash-remuneration-user">{{ user?.name }}</span>'
})

export const CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111' as Address
export const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const buildCashRemunerationQueryResult = () => ({
  cashRemunerationDeposits: {
    items: [
      {
        id: '0xdeposithash-0',
        contractAddress: CONTRACT_ADDRESS,
        depositor: '0x2222222222222222222222222222222222222222',
        amount: '1000000000000000000',
        timestamp: 1_700_000_000
      }
    ]
  },
  cashRemunerationWithdraws: {
    items: [
      {
        id: '0xwithdrawhash-0',
        contractAddress: CONTRACT_ADDRESS,
        withdrawer: '0x3333333333333333333333333333333333333333',
        amount: '2000000000000000000',
        timestamp: 1_700_000_100
      }
    ]
  },
  cashRemunerationWithdrawTokens: { items: [] },
  cashRemunerationWageClaims: { items: [] },
  cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
  cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
  cashRemunerationOfficerUpdateds: { items: [] },
  cashRemunerationTokenSupportAddeds: { items: [] },
  cashRemunerationTokenSupportRemoveds: { items: [] },
  cashRemunerationOwnershipTransferreds: { items: [] }
})

export const buildIncomingTransfersQueryResult = () => ({
  bankTokenTransfers: {
    items: [
      {
        id: '0xbankfundinghash-0',
        contractAddress: '0x9999999999999999999999999999999999999999',
        sender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        to: CONTRACT_ADDRESS,
        token: USDC_ADDRESS,
        amount: '1000000',
        timestamp: 1_700_000_050
      }
    ]
  }
})

export const createWrapper = (cashRemunerationAddress: Address = CONTRACT_ADDRESS): VueWrapper =>
  mount(CashRemunerationTransactions, {
    props: {
      cashRemunerationAddress
    },
    global: {
      stubs: {
        UCard: UCardStub,
        UTable: UTableStub,
        USelect: USelectStub,
        UBadge: UBadgeStub,
        AddressToolTip: AddressToolTipStub,
        CustomDatePicker: CustomDatePickerStub,
        UserComponent: UserComponentStub
      }
    }
  })
