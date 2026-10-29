import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import SafeSwapsTable from '../SafeSwapsTable.vue'
import type { SafeSwap, SafeSwapPnl } from '@/utils/safe/swapPnl'

const { mockSwapPnl } = vi.hoisted(() => ({
  mockSwapPnl: {
    data: undefined as unknown as { value: SafeSwapPnl | undefined },
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

const swap = (overrides: Partial<SafeSwap> = {}): SafeSwap => ({
  txHash: '0xswap',
  executionDate: '2026-06-01T10:00:00Z',
  given: [{ asset: 'usdc', symbol: 'USDC', quantity: 1000, usd: 1000 }],
  received: [
    { asset: 'weth', symbol: 'WETH', quantity: 0.5, usd: 1200 },
    { asset: 'native', symbol: 'POL', quantity: 2, usd: 1 }
  ],
  swappedUsd: 996.5,
  currentUsd: 1201,
  pnlUsd: 204.5,
  fee: { symbol: 'USDC', quantity: 3.5, usd: 3.5 },
  ...overrides
})

const report = (swaps: SafeSwap[], overrides: Partial<SafeSwapPnl> = {}): SafeSwapPnl => ({
  count: swaps.length,
  swaps,
  swappedUsd: 0,
  currentUsd: 0,
  pnlUsd: 0,
  pnlRatio: null,
  feesUsd: null,
  feesReported: 0,
  missingPrices: [],
  ...overrides
})

describe('[US-SAFE-008] SafeSwapsTable', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    mockSwapPnl.data = ref(report([swap()]))
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

  it('[AC-US-SAFE-008-01] shows each swap with the tokens sold, the tokens received and its values', () => {
    createWrapper()

    expect(mockSwapPnl.address).toHaveBeenCalledWith(SAFE)
    const table = find('safe-swaps-table')
    expect(table.findAll('th').map((cell) => cell.text())).toEqual([
      'Date',
      'Sold',
      'Received',
      'Swapped value',
      'Current value',
      'P&L',
      'Fee',
      'On-chain transaction'
    ])
    expect(table.get('[data-test="safe-swap-given"]').text()).toBe('1,000 USDC')
    const received = table
      .get('[data-test="safe-swap-received"]')
      .findAll('[data-test="safe-swap-leg"]')
    expect(received.map((leg) => leg.text())).toEqual(['0.5 WETH', '2 POL'])
    expect(table.text()).toContain('$996.50')
    expect(table.text()).toContain('$1,201.00')
    expect(table.get('[data-test="safe-swap-row-pnl"]').text()).toBe('$204.50')
    expect(table.get('[data-test="safe-swap-row-pnl"]').attributes('data-trend')).toBe('gain')
    expect(table.get('[data-test="safe-swap-row-fee"]').text()).toContain('3.5 USDC')
    expect(table.text()).toContain('0xswap')
  })

  it('[AC-US-SAFE-008-02] lists the swaps newest first', () => {
    mockSwapPnl.data.value = report([
      swap({ txHash: '0xolder', executionDate: '2026-05-01T10:00:00Z' }),
      swap({ txHash: '0xnewer', executionDate: '2026-07-01T10:00:00Z' })
    ])
    createWrapper()

    const rows = find('safe-swaps-table').findAll('tbody tr')
    expect(rows.map((row) => row.text())).toEqual([
      expect.stringContaining('0xnewer'),
      expect.stringContaining('0xolder')
    ])
    expect(
      find('safe-swaps-mobile-list')
        .findAll('li')
        .map((row) => row.text())
    ).toEqual([expect.stringContaining('0xnewer'), expect.stringContaining('0xolder')])
    expect(mockSwapPnl.data.value!.swaps.map(({ txHash }) => txHash)).toEqual([
      '0xolder',
      '0xnewer'
    ])
  })

  it('[AC-US-SAFE-008-03] marks a loss and leaves unknown values unavailable', () => {
    mockSwapPnl.data.value = report(
      [swap({ pnlUsd: -50 }), swap({ txHash: '0xb', currentUsd: null, pnlUsd: -996.5, fee: null })],
      { missingPrices: ['WETH'] }
    )
    createWrapper()

    const pnl = wrapper.findAll('[data-test="safe-swap-row-pnl"]')
    expect(pnl.map((cell) => cell.attributes('data-trend'))).toEqual(['loss', 'flat'])
    expect(pnl[1]!.text()).toBe('—')
    expect(find('safe-swaps-missing-prices').text()).toContain('WETH')
  })

  it('[AC-US-SAFE-008-04] shows an empty, loading and error state', async () => {
    mockSwapPnl.data.value = report([])
    createWrapper()
    expect(find('safe-swaps-empty').exists()).toBe(true)

    mockSwapPnl.isLoading.value = true
    await wrapper.vm.$nextTick()
    expect(find('safe-swaps-loading').exists()).toBe(true)

    mockSwapPnl.isError.value = true
    await wrapper.vm.$nextTick()
    expect(find('safe-swaps-error').exists()).toBe(true)
    expect(find('safe-swaps-table').exists()).toBe(false)
  })
})
