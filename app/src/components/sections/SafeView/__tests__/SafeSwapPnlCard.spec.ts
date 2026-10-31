import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import SafeSwapPnlCard from '../SafeSwapPnlCard.vue'
import type { SafeCostBasis } from '@/utils/safe/costBasis'

const { mockSwapPnl } = vi.hoisted(() => ({
  mockSwapPnl: {
    costBasis: undefined as unknown as { value: SafeCostBasis | undefined },
    address: vi.fn()
  }
}))

vi.mock('@/composables/safe/useSafeSwapPnl', () => ({
  useSafeSwapPnl: (address: () => string) => {
    mockSwapPnl.address(address())
    return { costBasis: mockSwapPnl.costBasis, isLoading: ref(false), isError: ref(false) }
  }
}))

const SAFE = '0x5AFE00000000000000000000000000000000cafe'

const basis = (overrides: Partial<SafeCostBasis> = {}): SafeCostBasis => ({
  count: 2,
  pnlUsd: 200,
  pnlRatio: 0.2,
  feesUsd: 3.5,
  unvaluedTokens: [],
  positions: [],
  swaps: [],
  ...overrides
})

describe('[US-SAFE-007] SafeSwapPnlCard', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    mockSwapPnl.costBasis = ref(basis())
    mockSwapPnl.address.mockClear()
  })
  afterEach(() => wrapper?.unmount())

  const createWrapper = () => (wrapper = mount(SafeSwapPnlCard, { props: { address: SAFE } }))
  const text = (key: string) => wrapper.get(`[data-test="safe-swap-${key}"]`).text()
  const trend = () => wrapper.get('[data-test="safe-pnl-amount"]').attributes('data-trend')

  it('[AC-US-SAFE-007-01] shows the number of swaps, the P&L, then the fees apart', () => {
    createWrapper()

    expect(mockSwapPnl.address).toHaveBeenCalledWith(SAFE)
    expect(wrapper.findAll('dt').map((label) => label.text())).toEqual(['P&L', 'Transaction fees'])
    expect(wrapper.find('[title]').exists()).toBe(false)
    expect(text('pnl')).toContain('2 swaps')
    expect(text('pnl-value')).toContain('$200.00')
    expect(text('pnl-value')).toContain('+20.00%')
    expect(text('fees')).toContain('$3.50')
  })

  it('[AC-US-SAFE-007-05] marks a gain and a loss', async () => {
    createWrapper()
    expect(trend()).toBe('gain')

    mockSwapPnl.costBasis.value = basis({ pnlUsd: -92.18, pnlRatio: -0.1742 })
    await wrapper.vm.$nextTick()
    expect(trend()).toBe('loss')
    expect(text('pnl-value')).toContain('-$92.18')
  })

  it('[AC-US-SAFE-007-07] shows the fees as unavailable when no swap reports one', () => {
    mockSwapPnl.costBasis.value = basis({ feesUsd: null })
    createWrapper()

    expect(text('fees')).toContain('—')
  })

  it('[AC-US-SAFE-007-08] flags the P&L as incomplete and names the tokens it leaves out', () => {
    mockSwapPnl.costBasis.value = basis({ unvaluedTokens: ['WETH'] })
    createWrapper()

    expect(text('unvalued')).toContain('WETH')
  })

  it('[AC-US-SAFE-007-09] stays hidden without a swap or while the figures are unavailable', async () => {
    mockSwapPnl.costBasis.value = basis({ count: 0 })
    createWrapper()
    expect(wrapper.find('[data-test="safe-swap-pnl"]').exists()).toBe(false)

    mockSwapPnl.costBasis.value = undefined
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="safe-swap-pnl"]').exists()).toBe(false)
  })
})
