import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { Address } from 'viem'

import BankTransactions from '../BankTransactions.vue'

export type BankRow = {
  type: string
  txHash: string
  amount: string | number
  amountLocal: number
  token: string
  subRows?: BankRow[]
}
type Column = { header: string }

export const tableData = (wrapper: VueWrapper) =>
  wrapper.findComponent({ name: 'UTable' }).props('data') as BankRow[]
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
    rowContext(original: BankRow, depth: number) {
      return {
        original,
        depth
      }
    }
  },
  template: `
    <div data-test="bank-table">
      <template v-for="(row, index) in data || []" :key="index">
        <div data-test="bank-rendered-row">
          <slot name="counterparty-cell" :row="rowContext(row, 0)" />
          <slot name="value-cell" :row="rowContext(row, 0)" />
        </div>
        <div
          v-for="(child, childIndex) in (typeof getSubRows === 'function' ? getSubRows(row) : row.subRows || [])"
          :key="String(index) + '-' + String(childIndex)"
          data-test="bank-rendered-child-row"
        >
          <slot name="counterparty-cell" :row="rowContext(child, 1)" />
          <slot name="value-cell" :row="rowContext(child, 1)" />
        </div>
      </template>
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
  template: '<span data-test="bank-user">{{ user?.name }}</span>'
})

export const BANK_ADDRESS = '0x1111111111111111111111111111111111111111' as Address
export const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const buildBankQueryResult = () => ({
  bankDeposits: {
    items: [
      {
        id: '0xdeposithash-0',
        contractAddress: BANK_ADDRESS,
        depositor: '0x2222222222222222222222222222222222222222',
        amount: '1000000000000000000',
        timestamp: 1_700_000_000
      }
    ]
  },
  bankTokenDeposits: {
    items: [
      {
        id: '0xdeposithash-1',
        depositor: '0x2222222222222222222222222222222222222222',
        contractAddress: BANK_ADDRESS,
        token: USDC_ADDRESS,
        amount: '1000000',
        timestamp: 1_699_999_999
      }
    ]
  },
  bankTransfers: {
    items: [
      {
        id: '0xtransferhash-0',
        sender: '0x3333333333333333333333333333333333333333',
        to: '0x4444444444444444444444444444444444444444',
        amount: '5000000',
        timestamp: 1_700_000_100
      }
    ]
  },
  bankTokenTransfers: { items: [] },
  bankDividendDistributionTriggereds: { items: [] },
  bankFeePaids: { items: [] },
  bankOwnershipTransferreds: { items: [] },
  rawContractTokenTransfers: { items: [] }
})

export const createWrapper = (bankAddress: Address = BANK_ADDRESS): VueWrapper =>
  mount(BankTransactions, {
    props: {
      bankAddress
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
