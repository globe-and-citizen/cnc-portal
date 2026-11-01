import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import SafeSwapsTable from '../SafeSwapsTable.vue'
import type {
  SafeCostBasis,
  SafeCostBasisEvent,
  SafeSwapExchange,
  SafeTokenPosition
} from '@/utils/safe/costBasis'

const { mockSwapPnl } = vi.hoisted(() => ({
  mockSwapPnl: {
    costBasis: undefined as unknown as { value: SafeCostBasis | undefined },
    isLoading: undefined as unknown as { value: boolean },
    isError: undefined as unknown as { value: boolean },
    address: vi.fn()
  }
}))

vi.mock('@/composables/safe/useSafeSwapPnl', () => ({
  useSafeSwapPnl: (address: () => string) => {
    mockSwapPnl.address(address())
    return mockSwapPnl
  }
}))

const SAFE = '0x5AFE00000000000000000000000000000000cafe'
const USDC = { asset: 'usdc', symbol: 'USDC' }
const WETH = { asset: 'weth', symbol: 'WETH' }

const exchange = (overrides: Partial<SafeSwapExchange> = {}): SafeSwapExchange => ({
  txHash: '0xswap',
  executionDate: '2026-10-20T14:22:10Z',
  given: [{ ...USDC, quantity: 529.07 }],
  received: [{ ...WETH, quantity: 0.1943 }],
  valueUsd: 529.07,
  fee: { ...USDC, quantity: 3.87, usd: 3.87 },
  ...overrides
})

const weth = (overrides: Partial<SafeTokenPosition> = {}): SafeTokenPosition => ({
  ...WETH,
  quantity: 0.1943,
  costUsd: 529.07,
  averageCostUsd: 2722.95,
  priceUsd: 2248.53,
  valueUsd: 436.89,
  pnlUsd: -92.18,
  history: [
    {
      txHash: '0xswap',
      executionDate: '2026-10-20T14:22:10Z',
      kind: 'swap',
      swap: exchange(),
      quantity: 0.1943,
      priceUsd: 2722.95,
      quantityHeld: 0.1943,
      pnlUsd: null
    }
  ],
  ...overrides
})

const usdcEvent = (overrides: Partial<SafeCostBasisEvent>): SafeCostBasisEvent => ({
  txHash: '0xswap',
  executionDate: '2026-10-20T14:22:10Z',
  kind: 'swap',
  swap: exchange(),
  quantity: 529.07,
  priceUsd: 1,
  quantityHeld: 3.87,
  pnlUsd: 0,
  ...overrides
})

const usdc: SafeTokenPosition = {
  ...USDC,
  quantity: 0,
  costUsd: 0,
  averageCostUsd: null,
  priceUsd: null,
  valueUsd: null,
  pnlUsd: 0,
  history: [
    usdcEvent({
      txHash: '0xdeposit',
      executionDate: '2026-10-03T14:33:41Z',
      kind: 'received',
      swap: null,
      quantity: 532.94,
      quantityHeld: 532.94,
      pnlUsd: null
    }),
    usdcEvent({}),
    usdcEvent({
      kind: 'fee',
      quantity: 3.87,
      quantityHeld: 0,
      pnlUsd: null
    })
  ]
}

const basis = (overrides: Partial<SafeCostBasis> = {}): SafeCostBasis => ({
  count: 1,
  pnlUsd: -92.18,
  pnlRatio: -0.1742,
  feesUsd: 3.87,
  unvaluedTokens: [],
  positions: [weth(), usdc],
  swaps: [exchange()],
  ...overrides
})

describe('[US-SAFE-008] SafeSwapsTable', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    mockSwapPnl.costBasis = ref(basis())
    mockSwapPnl.isLoading = ref(false)
    mockSwapPnl.isError = ref(false)
    mockSwapPnl.address.mockClear()
  })
  afterEach(() => wrapper?.unmount())

  const createWrapper = () =>
    (wrapper = mount(SafeSwapsTable, {
      props: { address: SAFE },
      global: {
        stubs: { AddressTooltip: { props: ['address'], template: '<i>{{ address }}</i>' } }
      }
    }))
  const find = (key: string) => wrapper.find(`[data-test="${key}"]`)
  const headers = (key: string) =>
    find(key)
      .findAll('th')
      .map((cell) => cell.text())
  const rows = (key: string) => find(key).findAll('tbody tr')
  const openSwapsTab = async () => {
    const tab = wrapper
      .findAll('[role="tab"]')
      .find((trigger) => trigger.text().startsWith('Swaps'))!
    await tab.trigger('mousedown', { button: 0 })
    await flushPromises()
  }

  it('[AC-US-SAFE-008-05] shows each token the swaps touched with its cost, price today and P&L', () => {
    createWrapper()

    expect(mockSwapPnl.address).toHaveBeenCalledWith(SAFE)
    expect(headers('safe-swap-positions')).toEqual([
      'Token',
      'Quantity held',
      'Average buy price',
      'Total cost',
      'Price today',
      'P&L',
      ''
    ])
    const [held, closed] = rows('safe-swap-positions')
    expect(held!.text()).toContain('0.1943')
    expect(held!.text()).toContain('$2,722.95')
    expect(held!.text()).toContain('$529.07')
    expect(held!.text()).toContain('$2,248.53')
    expect(held!.get('[data-test="safe-pnl-amount"]').text()).toBe('-$92.18')
    expect(held!.get('[data-test="safe-pnl-amount"]').attributes('data-trend')).toBe('loss')
    expect(closed!.get('[data-test="safe-swap-position-closed"]').text()).toBe('No longer held')
  })

  it('[AC-US-SAFE-008-06] opens the history of a token with today’s valuation of what remains', async () => {
    createWrapper()
    expect(find('safe-swap-position-history').exists()).toBe(false)

    await find('safe-swap-history-WETH').trigger('click')

    const history = find('safe-swap-position-history')
    expect(history.text()).toContain('WETH history')
    const [swap, today] = history.findAll('tbody tr')
    expect(swap!.text()).toContain('Swap · 529.07 USDC → 0.1943 WETH')
    expect(today!.text()).toContain('Today')
    expect(today!.text()).toContain('-$92.18')
    expect(find('safe-swap-position-pnl').text()).toContain('-$92.18')
  })

  it('[AC-US-SAFE-008-06] shows what was held before a swap instead of the deposits and payments', async () => {
    createWrapper()

    await find('safe-swap-history-USDC').trigger('click')

    const cells = find('safe-swap-position-history')
      .findAll('tbody tr')
      .map((row) => row.findAll('td').map((cell) => cell.text()))
    expect(cells.map(([, operation, price, quantity]) => [operation, price, quantity])).toEqual([
      ['Before swap · 532.94 USDC', '—', '532.94'],
      ['Swap · 529.07 USDC → 0.1943 WETH', '$1.00', '529.07'],
      ['Fee · 3.87 USDC', '$1.00', '3.87']
    ])
  })

  it('[AC-US-SAFE-008-01] shows each swap with the tokens exchanged, its value on its day and its fee', async () => {
    createWrapper()
    await openSwapsTab()

    expect(headers('safe-swaps-table')).toEqual([
      'Date',
      'Exchange',
      'Value on swap day',
      'Fee',
      'On-chain transaction'
    ])
    const [swap] = rows('safe-swaps-table')
    expect(swap!.get('[data-test="safe-swap-given"]').text()).toBe('529.07 USDC')
    expect(swap!.get('[data-test="safe-swap-received"]').text()).toBe('0.1943 WETH')
    expect(swap!.text()).toContain('$529.07')
    expect(swap!.get('[data-test="safe-swap-row-fee"]').text()).toContain('3.87 USDC')
    expect(swap!.text()).toContain('0xswap')
  })

  it('[AC-US-SAFE-008-02] lists the swaps newest first without reordering the shared report', async () => {
    mockSwapPnl.costBasis.value = basis({
      count: 2,
      swaps: [exchange({ txHash: '0xolder', executionDate: '2026-05-01T10:00:00Z' }), exchange()]
    })
    createWrapper()
    await openSwapsTab()

    const [newest, older] = rows('safe-swaps-table')
    expect(newest!.text()).toContain('0xswap')
    expect(older!.text()).toContain('0xolder')
    expect(mockSwapPnl.costBasis.value!.swaps.map(({ txHash }) => txHash)).toEqual([
      '0xolder',
      '0xswap'
    ])
  })

  it('[AC-US-SAFE-008-03] leaves an unvalued token unavailable and names it', () => {
    mockSwapPnl.costBasis.value = basis({
      positions: [weth({ priceUsd: null, valueUsd: null, pnlUsd: null }), usdc],
      unvaluedTokens: ['WETH']
    })
    createWrapper()

    const pnl = rows('safe-swap-positions')[0]!.get('[data-test="safe-pnl-amount"]')
    expect(pnl.text()).toBe('—')
    expect(pnl.attributes('data-trend')).toBe('flat')
    expect(find('safe-swaps-unvalued').text()).toContain('WETH')
  })

  it('[AC-US-SAFE-008-04] shows an empty, loading and error state', async () => {
    mockSwapPnl.costBasis.value = basis({ count: 0, positions: [], swaps: [] })
    createWrapper()
    expect(find('safe-swaps-empty').exists()).toBe(true)

    mockSwapPnl.isLoading.value = true
    await wrapper.vm.$nextTick()
    expect(find('safe-swaps-loading').exists()).toBe(true)

    mockSwapPnl.isError.value = true
    await wrapper.vm.$nextTick()
    expect(find('safe-swaps-error').exists()).toBe(true)
    expect(find('safe-swap-positions').exists()).toBe(false)
  })
})
