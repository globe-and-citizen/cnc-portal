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
  template: `
    <div data-test="expense-table" :data-loading="String(Boolean(loading))">
      <div v-for="(column, index) in columns || []" :key="index" data-test="table-header">
        {{ column.header }}
      </div>
      <template v-if="data && data.length > 0">
        <div v-for="(row, index) in data" :key="index" data-test="table-row">
          <span data-test="row-tx-hash">{{ row.txHash }}</span>
          <span data-test="row-type">{{ row.type }}</span>
          <span data-test="row-grouped-event-count">{{ row.groupedEventCount ?? 0 }}</span>
          <span data-test="row-sub-row-count">{{ row.subRows?.length ?? 0 }}</span>
          <span data-test="row-amount">{{ row.amount }}</span>
          <span data-test="row-amount-local">{{ row.amountLocal }}</span>
          <span data-test="row-token">{{ row.token }}</span>
        </div>
      </template>
      <slot v-else name="empty" />
    </div>
  `
})

export const USelectStub = defineComponent({
  name: 'USelect',
  props: {
    modelValue: { type: String, required: false },
    items: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: `
    <select
      data-test="type-filter"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option
        v-for="item in items || []"
        :key="typeof item === 'string' ? item : item.value"
        :value="typeof item === 'string' ? item : item.value"
      >
        {{ typeof item === 'string' ? item : item.label }}
      </option>
    </select>
  `
})

export const CustomDatePickerStub = defineComponent({
  name: 'CustomDatePicker',
  props: { modelValue: { type: Array, required: false } },
  emits: ['update:modelValue'],
  template: `
    <div data-test="date-filter">
      <button
        data-test="date-filter-set-2020"
        @click="$emit('update:modelValue', [new Date('2020-01-01T00:00:00Z'), new Date('2020-01-01T23:59:59Z')])"
      >
        set-range
      </button>
      <button data-test="date-filter-clear" @click="$emit('update:modelValue', null)">clear-range</button>
    </div>
  `
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

export const buildGroupedExpenseQueryResult = () => ({
  expenseDeposits: {
    items: [
      {
        id: '0xsharedhash-0',
        contractAddress: EXPENSE_ADDRESS,
        depositor: '0x2222222222222222222222222222222222222222',
        amount: '1000000000000000000',
        timestamp: 1_700_000_700
      }
    ]
  },
  expenseTokenDeposits: {
    items: [
      {
        id: '0xsharedhash-1',
        contractAddress: EXPENSE_ADDRESS,
        depositor: '0x2222222222222222222222222222222222222222',
        token: USDC_ADDRESS,
        amount: '500000',
        timestamp: 1_700_000_699
      }
    ]
  },
  expenseTransfers: {
    items: [
      {
        id: '0xsinglehash-0',
        contractAddress: EXPENSE_ADDRESS,
        withdrawer: '0x3333333333333333333333333333333333333333',
        to: '0x4444444444444444444444444444444444444444',
        amount: '1000',
        timestamp: 1_700_000_650
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
