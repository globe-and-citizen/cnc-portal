import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import * as utils from '@/utils'
import { useQuery } from '@vue/apollo-composable'
import { useCurrencyStore } from '@/stores/currencyStore'
import {
  createMockApolloQueryState,
  makeCurrencyStoreMock,
  mockApolloUseQuery,
  resetMockApolloQueryState
} from '@/tests/mocks'
import type { BankRow } from './BankTransactions.fixture'

// Auto-imported @nuxt/ui components bypass `config.global.stubs` because the
// Nuxt UI Vite plugin resolves them through their file path. Mocking the
// modules ensures our stubs are actually rendered so we can drive them by
// emitting `update:modelValue` and read props instead of reaching into
// `wrapper.vm`.
vi.mock('@nuxt/ui/components/Table.vue', () => ({
  default: {
    name: 'UTable',
    props: ['data', 'columns', 'loading', 'getSubRows'],
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
  }
}))
vi.mock('@nuxt/ui/components/Select.vue', () => ({
  default: {
    name: 'USelect',
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
    template: '<div data-test="bank-type-filter"></div>'
  }
}))

const bankQuery = createMockApolloQueryState()
const mockCurrencyStore = makeCurrencyStoreMock()
const mockGetTokenPrice = mockCurrencyStore.getTokenPrice

import {
  BANK_ADDRESS,
  USDC_ADDRESS,
  ZERO_ADDRESS,
  buildBankQueryResult,
  createWrapper,
  tableColumns,
  tableData,
  tableLoading
} from './BankTransactions.fixture'

describe('BankTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    mockApolloUseQuery(vi.mocked(useQuery), bankQuery)
    vi.mocked(useCurrencyStore).mockReturnValue(
      mockCurrencyStore as unknown as ReturnType<typeof useCurrencyStore>
    )
    resetMockApolloQueryState(bankQuery, buildBankQueryResult())
    mockCurrencyStore.supportedTokens = [
      { id: 'native', symbol: 'ETH', address: ZERO_ADDRESS },
      { id: 'usdc', symbol: 'USDC', address: USDC_ADDRESS }
    ]
    mockGetTokenPrice.mockReturnValue(1)
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('maps query data and passes rows/columns to UTable', () => {
    wrapper = createWrapper()

    const data = tableData(wrapper)
    const columns = tableColumns(wrapper)

    expect(data).toHaveLength(2)
    expect(data.map((row) => row.type)).toEqual(expect.arrayContaining(['deposit', 'transfer']))
    expect(columns.some((column) => column.header === 'Value (USD)')).toBe(true)
  })

  it('passes loading state to UTable', () => {
    bankQuery.loading.value = true

    wrapper = createWrapper()
    expect(tableLoading(wrapper)).toBe(true)
  })

  it('filters displayed rows by selected type', async () => {
    wrapper = createWrapper()

    wrapper.getComponent({ name: 'USelect' }).vm.$emit('update:modelValue', 'deposit')
    await nextTick()

    const data = tableData(wrapper)
    expect(data).toHaveLength(1)
    expect(data[0]?.type).toBe('deposit')
  })

  it('filters displayed rows by date range', async () => {
    wrapper = createWrapper()

    wrapper
      .getComponent({ name: 'CustomDatePicker' })
      .vm.$emit('update:modelValue', [
        new Date('2020-01-01T00:00:00Z'),
        new Date('2020-01-01T23:59:59Z')
      ])
    await nextTick()

    expect(tableData(wrapper)).toHaveLength(0)
  })

  it('uses disabled query option when bank address is empty', () => {
    wrapper = createWrapper('' as Address)

    const queryVariables = vi.mocked(useQuery).mock.calls[0]?.[1] as {
      contractAddress: { value: string }
    }
    const queryOptions = vi.mocked(useQuery).mock.calls[0]?.[2] as { enabled: { value: boolean } }

    expect(queryVariables.contractAddress.value).toBe('')
    expect(queryOptions.enabled.value).toBe(false)
  })

  it('handles token resolution fallback and invalid amounts', () => {
    mockCurrencyStore.supportedTokens = []
    mockGetTokenPrice.mockImplementation((tokenId: string) => (tokenId === 'native' ? 3 : 0))
    bankQuery.result.value = {
      bankDeposits: {
        items: [
          {
            id: '0xnativedeposit-0',
            contractAddress: BANK_ADDRESS,
            depositor: '0x2222222222222222222222222222222222222222',
            amount: '1000000000000000000',
            timestamp: 1_700_000_500
          }
        ]
      },
      bankTokenDeposits: {
        items: []
      },
      bankTransfers: { items: [] },
      bankTokenTransfers: {
        items: [
          {
            id: '0xunknowntx-0',
            sender: '0x3333333333333333333333333333333333333333',
            to: '0x4444444444444444444444444444444444444444',
            token: '0x9999999999999999999999999999999999999999',
            amount: 'not-a-number',
            timestamp: 1_700_000_600
          }
        ]
      },
      bankDividendDistributionTriggereds: { items: [] },
      bankFeePaids: { items: [] },
      bankOwnershipTransferreds: { items: [] },
      rawContractTokenTransfers: { items: [] }
    }

    wrapper = createWrapper()
    const data = tableData(wrapper)

    const nativeRow = data.find((row) => row.txHash === '0xnativedeposit')
    const unknownRow = data.find((row) => row.txHash === '0xunknowntx')

    expect(nativeRow?.amountLocal).toBe(3)
    expect(unknownRow?.amount).toBe('0')
    expect(unknownRow?.amountLocal).toBe(0)
    expect(unknownRow?.token).toBe('ERC20')
  })

  it('renders child value fallback for grouped zero-value events', () => {
    bankQuery.result.value = {
      bankDeposits: {
        items: [
          {
            id: '0xsharedzerohash-0',
            contractAddress: BANK_ADDRESS,
            depositor: '0x2222222222222222222222222222222222222222',
            amount: '1000000000000000000',
            timestamp: 1_700_000_500
          }
        ]
      },
      bankTokenDeposits: {
        items: [
          {
            id: '0xsharedzerohash-1',
            depositor: '0x2222222222222222222222222222222222222222',
            contractAddress: BANK_ADDRESS,
            token: USDC_ADDRESS,
            amount: '0',
            timestamp: 1_700_000_501
          }
        ]
      },
      bankTransfers: { items: [] },
      bankTokenTransfers: { items: [] },
      bankDividendDistributionTriggereds: { items: [] },
      bankFeePaids: { items: [] },
      bankOwnershipTransferreds: { items: [] },
      rawContractTokenTransfers: { items: [] }
    }

    wrapper = createWrapper()

    expect(wrapper.find('[data-test="bank-rendered-child-row"]').text()).toContain('—')
  })

  it('maps token support and ownership transfer events with a — value', () => {
    bankQuery.result.value = {
      ...buildBankQueryResult(),
      bankDeposits: { items: [] },
      bankTransfers: { items: [] },
      bankOwnershipTransferreds: {
        items: [
          {
            id: '0xownershiphash-0',
            contractAddress: BANK_ADDRESS,
            previousOwner: '0x5555555555555555555555555555555555555555',
            newOwner: '0x6666666666666666666666666666666666666666',
            timestamp: 1_700_000_200
          }
        ]
      },
      bankTokenSupportAddeds: {
        items: [
          {
            id: '0xtokensupportaddedhash-0',
            contractAddress: BANK_ADDRESS,
            tokenAddress: USDC_ADDRESS,
            timestamp: 1_700_000_300
          }
        ]
      },
      bankTokenSupportRemoveds: {
        items: [
          {
            id: '0xtokensupportremovedhash-0',
            contractAddress: BANK_ADDRESS,
            tokenAddress: USDC_ADDRESS,
            timestamp: 1_700_000_400
          }
        ]
      }
    }

    wrapper = createWrapper()
    const data = tableData(wrapper)

    const newEventTypes = ['ownershipTransferred', 'tokenSupportAdded', 'tokenSupportRemoved']
    expect(data.map((row) => row.type)).toEqual(expect.arrayContaining(newEventTypes))
    data
      .filter((row) => newEventTypes.includes(row.type))
      .forEach((row) => expect(row.amount).toBe('0'))
    expect(wrapper.findAll('[data-test="bank-rendered-row"]')[0]?.text()).toContain('—')
  })

  it('logs query errors', async () => {
    const logErrorSpy = vi.spyOn(utils.log, 'error')
    wrapper = createWrapper()

    const error = new Error('bank query failed')
    bankQuery.error.value = error
    await nextTick()

    expect(logErrorSpy).toHaveBeenCalledWith('Ponder bank transaction query error:', error)

    bankQuery.error.value = null
    await nextTick()

    expect(logErrorSpy).toHaveBeenCalledTimes(1)
  })
})
