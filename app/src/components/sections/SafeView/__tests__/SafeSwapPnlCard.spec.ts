import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import SafeSwapPnlCard from '../SafeSwapPnlCard.vue'
import type { SafeSwapPnl } from '@/utils/safe/swapPnl'

const { mockSwapPnl } = vi.hoisted(() => ({
  mockSwapPnl: {
    data: undefined as unknown as { value: SafeSwapPnl | undefined },
    address: vi.fn()
  }
}))

vi.mock('@/composables/safe/useSafeSwapPnl', () => ({
  useSafeSwapPnl: (address: () => string) => {
    mockSwapPnl.address(address())
    return { data: mockSwapPnl.data, isLoading: ref(false), isError: ref(false) }
  }
}))

const SAFE = '0x5AFE00000000000000000000000000000000cafe'

const report = (overrides: Partial<SafeSwapPnl> = {}): SafeSwapPnl => ({
  count: 2,
  swaps: [],
  swappedUsd: 1000,
  currentUsd: 1200,
  pnlUsd: 200,
  pnlRatio: 0.2,
  feesUsd: 3.5,
  feesReported: 2,
  missingPrices: [],
  ...overrides
})

describe('[US-SAFE-007] SafeSwapPnlCard', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    mockSwapPnl.data = ref(report())
    mockSwapPnl.address.mockClear()
  })
  afterEach(() => wrapper?.unmount())

  const createWrapper = () => (wrapper = mount(SafeSwapPnlCard, { props: { address: SAFE } }))
  const text = (key: string) => wrapper.get(`[data-test="safe-swap-${key}"]`).text()

  it('[AC-US-SAFE-007-01] shows the swapped value, the current value, the P&L, then the fees apart', () => {
    createWrapper()

    expect(mockSwapPnl.address).toHaveBeenCalledWith(SAFE)
    expect(wrapper.findAll('dt').map((label) => label.text())).toEqual([
      'Swapped value',
      'Current value swap',
      'P&L',
      'Transaction fees'
    ])
    expect(wrapper.find('[title]').exists()).toBe(false)
    expect(text('pnl')).toContain('2 swaps')
    expect(text('swapped')).toContain('$1,000.00')
    expect(text('current')).toContain('$1,200.00')
    expect(text('pnl-value')).toContain('$200.00')
    expect(text('pnl-value')).toContain('+20.00%')
    expect(text('fees')).toContain('$3.50')
  })

  it('[AC-US-SAFE-007-05] marks a gain and a loss', async () => {
    createWrapper()
    expect(wrapper.get('[data-test="safe-swap-pnl-value"] dd').attributes('data-trend')).toBe(
      'gain'
    )

    mockSwapPnl.data.value = report({ pnlUsd: -100, pnlRatio: -0.1 })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="safe-swap-pnl-value"] dd').attributes('data-trend')).toBe(
      'loss'
    )
  })

  it('[AC-US-SAFE-007-07] shows the fees as unavailable when no swap reports one', () => {
    mockSwapPnl.data.value = report({ feesUsd: null, feesReported: 0 })
    createWrapper()

    expect(text('fees')).toContain('—')
  })

  it('[AC-US-SAFE-007-08] flags the figures as incomplete when a price is missing', () => {
    mockSwapPnl.data.value = report({ missingPrices: ['WETH'] })
    createWrapper()

    expect(text('missing-prices')).toContain('WETH')
  })

  it('[AC-US-SAFE-007-09] stays hidden without a swap or while the figures are unavailable', async () => {
    mockSwapPnl.data.value = report({ count: 0 })
    createWrapper()
    expect(wrapper.find('[data-test="safe-swap-pnl"]').exists()).toBe(false)

    mockSwapPnl.data.value = undefined
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="safe-swap-pnl"]').exists()).toBe(false)
  })
})
