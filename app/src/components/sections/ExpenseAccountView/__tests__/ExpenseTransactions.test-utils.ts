import { defineComponent } from 'vue'
import type { Address } from 'viem'

export const UCardStub = defineComponent({
  name: 'UCard',
  template: '<div><slot name="header" /><slot /></div>'
})

export const UTableStub = defineComponent({
  name: 'UTable',
  props: {
    data: { type: Array, required: false },
    columns: { type: Array, required: false },
    loading: { type: Boolean, required: false }
  },
  template: '<div data-test="expense-table"></div>'
})

export const USelectStub = defineComponent({
  name: 'USelect',
  props: {
    modelValue: { type: String, required: false },
    items: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="type-filter"></div>'
})

export const CustomDatePickerStub = defineComponent({
  name: 'CustomDatePicker',
  props: { modelValue: { type: Array, required: false } },
  emits: ['update:modelValue'],
  template: '<div data-test="date-filter"></div>'
})

export const AddressToolTipStub = defineComponent({
  name: 'AddressToolTip',
  template: '<div />'
})

export const UBadgeStub = defineComponent({
  name: 'UBadge',
  template: '<span><slot /></span>'
})

export const EXPENSE_ADDRESS = '0x1111111111111111111111111111111111111111' as Address
export const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const buildExpenseQueryResult = () => ({
  expenseDeposits: {
    items: [
      {
        id: '0xdeposithash-0',
        contractAddress: EXPENSE_ADDRESS,
        depositor: '0x2222222222222222222222222222222222222222',
        amount: '1000000000000000000',
        timestamp: 1_700_000_000
      }
    ]
  },
  expenseTokenDeposits: { items: [] },
  expenseTransfers: {
    items: [
      {
        id: '0xtransferhash-0',
        contractAddress: EXPENSE_ADDRESS,
        withdrawer: '0x3333333333333333333333333333333333333333',
        to: '0x4444444444444444444444444444444444444444',
        amount: '5000000',
        timestamp: 1_700_000_100
      }
    ]
  },
  expenseTokenTransfers: { items: [] },
  expenseApprovals: { items: [] },
  expenseOwnerTreasuryWithdrawNatives: { items: [] },
  expenseOwnerTreasuryWithdrawTokens: { items: [] },
  expenseTokenSupportAddeds: { items: [] },
  expenseTokenSupportRemoveds: { items: [] },
  expenseTokenAddressChangeds: { items: [] }
})

export const buildIncomingTransfersQueryResult = () => ({
  bankTokenTransfers: {
    items: [
      {
        id: '0xbankfundinghash-0',
        contractAddress: '0x9999999999999999999999999999999999999999',
        sender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        to: EXPENSE_ADDRESS,
        token: USDC_ADDRESS,
        amount: '1000000',
        timestamp: 1_700_000_050
      }
    ]
  }
})

export const buildFallbackExpenseQueryResult = () => ({
  expenseDeposits: {
    items: [
      {
        id: '0xnativedeposit-0',
        contractAddress: EXPENSE_ADDRESS,
        depositor: '0x2222222222222222222222222222222222222222',
        amount: '1000000000000000000',
        timestamp: 1_700_000_500
      }
    ]
  },
  expenseTokenDeposits: { items: [] },
  expenseTransfers: { items: [] },
  expenseTokenTransfers: {
    items: [
      {
        id: '0xunknowntx-0',
        contractAddress: EXPENSE_ADDRESS,
        withdrawer: '0x3333333333333333333333333333333333333333',
        to: '0x4444444444444444444444444444444444444444',
        token: '0x9999999999999999999999999999999999999999',
        amount: 'not-a-number',
        timestamp: 1_700_000_600
      }
    ]
  },
  expenseApprovals: { items: [] },
  expenseOwnerTreasuryWithdrawNatives: { items: [] },
  expenseOwnerTreasuryWithdrawTokens: { items: [] },
  expenseTokenSupportAddeds: { items: [] },
  expenseTokenSupportRemoveds: { items: [] },
  expenseTokenAddressChangeds: { items: [] }
})
