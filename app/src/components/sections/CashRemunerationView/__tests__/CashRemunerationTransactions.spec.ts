import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { type VueWrapper } from '@vue/test-utils'
import type { Address } from 'viem'
import { useQuery } from '@vue/apollo-composable'
import { useCurrencyStore } from '@/stores/currencyStore'
import {
  createMockApolloQueryState,
  makeCurrencyStoreMock,
  mockApolloUseQueryByVariableKey,
  resetMockApolloQueryState
} from '@/tests/mocks'

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
      rowContext(original: unknown, depth: number) {
        return {
          original,
          depth
        }
      }
    },
    template: `
      <div data-test="cash-remuneration-table">
        <template v-for="(row, index) in data || []" :key="index">
          <div data-test="cash-remuneration-rendered-row">
            <slot name="type-cell" :row="rowContext(row, 0)" />
            <slot name="counterparty-cell" :row="rowContext(row, 0)" />
            <slot name="value-cell" :row="rowContext(row, 0)" />
          </div>
          <div
            v-for="(child, childIndex) in (typeof getSubRows === 'function' ? getSubRows(row) : row.subRows || [])"
            :key="String(index) + '-' + String(childIndex)"
            data-test="cash-remuneration-rendered-child-row"
          >
            <slot name="type-cell" :row="rowContext(child, 1)" />
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
    template: '<div data-test="cash-remuneration-type-filter"></div>'
  }
}))

const cashRemunerationQuery = createMockApolloQueryState()
const incomingTransfersQuery = createMockApolloQueryState()
const mockCurrencyStore = makeCurrencyStoreMock()
const mockGetTokenPrice = mockCurrencyStore.getTokenPrice

import {
  CONTRACT_ADDRESS,
  USDC_ADDRESS,
  ZERO_ADDRESS,
  tableData,
  tableColumns,
  tableLoading,
  buildCashRemunerationQueryResult,
  buildIncomingTransfersQueryResult,
  createWrapper
} from './CashRemunerationTransactions.fixture'

describe('CashRemunerationTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    mockApolloUseQueryByVariableKey(vi.mocked(useQuery), cashRemunerationQuery, {
      toAddress: incomingTransfersQuery
    })
    vi.mocked(useCurrencyStore).mockReturnValue(
      mockCurrencyStore as unknown as ReturnType<typeof useCurrencyStore>
    )
    resetMockApolloQueryState(cashRemunerationQuery, buildCashRemunerationQueryResult())
    resetMockApolloQueryState(incomingTransfersQuery, buildIncomingTransfersQueryResult())
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

    expect(data).toHaveLength(3)
    expect(data.map((row) => row.type)).toEqual(
      expect.arrayContaining(['deposit', 'tokenDeposit', 'withdraw'])
    )
    expect(columns.some((column) => column.header === 'Value (USD)')).toBe(true)
  })

  it('passes loading state to UTable', () => {
    incomingTransfersQuery.loading.value = true

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

  it('uses disabled query option when contract address is empty', () => {
    wrapper = createWrapper('' as Address)

    const cashQueryVariables = vi.mocked(useQuery).mock.calls[0]?.[1] as {
      contractAddress: { value: string }
    }

    const incomingQueryVariables = vi.mocked(useQuery).mock.calls[1]?.[1] as {
      toAddress: { value: string }
    }
    const incomingQueryOptions = vi.mocked(useQuery).mock.calls[1]?.[2] as {
      enabled: { value: boolean }
    }

    expect(cashQueryVariables.contractAddress.value).toBe('')

    expect(incomingQueryVariables.toAddress.value).toBe('')
    expect(incomingQueryOptions.enabled.value).toBe(false)
  })

  it('maps ownership transfer events with a zero amount', () => {
    apolloState.cashRemunerationQueryResult.value = {
      ...buildCashRemunerationQueryResult(),
      cashRemunerationOwnershipTransferreds: {
        items: [
          {
            id: '0xownershiphash-0',
            contractAddress: CONTRACT_ADDRESS,
            previousOwner: '0x5555555555555555555555555555555555555555',
            newOwner: '0x6666666666666666666666666666666666666666',
            timestamp: 1_700_000_200
          }
        ]
      }
    }

    wrapper = createWrapper()
    const data = tableData(wrapper)
    const ownershipRowIndex = data.findIndex((row) => row.type === 'ownershipTransferred')
    const ownershipRow = data[ownershipRowIndex]

    expect(ownershipRow).toBeDefined()
    expect(ownershipRow?.amount).toBe('0')
    expect(
      wrapper.findAll('[data-test="cash-remuneration-rendered-row"]')[ownershipRowIndex]?.text()
    ).toContain('→')
  })

  it('handles token resolution fallback and invalid amounts', () => {
    mockCurrencyStore.supportedTokens = []
    mockGetTokenPrice.mockImplementation((tokenId: string) => (tokenId === 'native' ? 3 : 0))
    cashRemunerationQuery.result.value = {
      cashRemunerationDeposits: {
        items: [
          {
            id: '0xnativedeposit-0',
            contractAddress: CONTRACT_ADDRESS,
            depositor: '0x2222222222222222222222222222222222222222',
            amount: '1000000000000000000',
            timestamp: 1_700_000_500
          }
        ]
      },
      cashRemunerationWithdraws: { items: [] },
      cashRemunerationWithdrawTokens: {
        items: [
          {
            id: '0xunknowntx-0',
            contractAddress: CONTRACT_ADDRESS,
            withdrawer: '0x4444444444444444444444444444444444444444',
            tokenAddress: '0x9999999999999999999999999999999999999999',
            amount: 'not-a-number',
            timestamp: 1_700_000_600
          }
        ]
      },
      cashRemunerationWageClaims: { items: [] },
      cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
      cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
      cashRemunerationOfficerUpdateds: { items: [] },
      cashRemunerationTokenSupportAddeds: { items: [] },
      cashRemunerationTokenSupportRemoveds: { items: [] }
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

  it('renders grouped child rows and aggregated parent values', () => {
    cashRemunerationQuery.result.value = {
      cashRemunerationDeposits: {
        items: [
          {
            id: '0xsharedhash-0',
            contractAddress: CONTRACT_ADDRESS,
            depositor: '0x2222222222222222222222222222222222222222',
            amount: '1000000000000000000',
            timestamp: 1_700_000_700
          }
        ]
      },
      cashRemunerationWithdraws: { items: [] },
      cashRemunerationWithdrawTokens: {
        items: [
          {
            id: '0xsharedhash-1',
            contractAddress: CONTRACT_ADDRESS,
            withdrawer: '0x3333333333333333333333333333333333333333',
            tokenAddress: USDC_ADDRESS,
            amount: '500000',
            timestamp: 1_700_000_701
          }
        ]
      },
      cashRemunerationWageClaims: { items: [] },
      cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
      cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
      cashRemunerationOfficerUpdateds: { items: [] },
      cashRemunerationTokenSupportAddeds: { items: [] },
      cashRemunerationTokenSupportRemoveds: { items: [] }
    }
    incomingTransfersQuery.result.value = undefined

    wrapper = createWrapper()

    expect(wrapper.find('[data-test="cash-remuneration-rendered-row"]').text()).toContain(
      'Token withdrawal'
    )
    expect(wrapper.find('[data-test="cash-remuneration-rendered-row"]').text()).toContain('USDC')
    expect(wrapper.find('[data-test="cash-remuneration-rendered-child-row"]').text()).toContain(
      'Token withdrawal'
    )
  })

  it('renders counterparty and value fallbacks for zero-value metadata events', () => {
    cashRemunerationQuery.result.value = {
      cashRemunerationDeposits: { items: [] },
      cashRemunerationWithdraws: { items: [] },
      cashRemunerationWithdrawTokens: { items: [] },
      cashRemunerationWageClaims: {
        items: [
          {
            id: '0xwageclaimhash-0',
            contractAddress: CONTRACT_ADDRESS,
            signatureHash: '0xsignature',
            enabled: true,
            timestamp: 1_700_000_800
          }
        ]
      },
      cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
      cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
      cashRemunerationOfficerUpdateds: { items: [] },
      cashRemunerationTokenSupportAddeds: { items: [] },
      cashRemunerationTokenSupportRemoveds: { items: [] }
    }
    incomingTransfersQuery.result.value = undefined

    wrapper = createWrapper()

    const renderedRow = wrapper.find('[data-test="cash-remuneration-rendered-row"]')
    expect(renderedRow.text()).toContain('Wage claim enabled')
    expect(renderedRow.text()).toContain('—')
  })
})
