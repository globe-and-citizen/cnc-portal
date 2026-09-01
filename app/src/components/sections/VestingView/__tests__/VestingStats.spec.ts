import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'

describe('VestingStats.vue', () => {
  it('renders all four V2 totals with the token symbol', () => {
    const wrapper = renderWithProviders(VestingStats, {
      props: {
        totals: {
          promised: 150_000_000n,
          vested: 90_000_000n,
          claimable: 60_000_000n,
          released: 30_000_000n
        },
        tokenSymbol: 'SHR',
        isLoading: false
      }
    })

    expect(wrapper.get('[data-test="vesting-promised"]').text()).toBe('150 SHR')
    expect(wrapper.get('[data-test="vesting-vested"]').text()).toBe('90 SHR')
    expect(wrapper.get('[data-test="vesting-claimable"]').text()).toBe('60 SHR')
    expect(wrapper.get('[data-test="vesting-released"]').text()).toBe('30 SHR')
  })

  it('shows skeletons while totals are loading', () => {
    const wrapper = renderWithProviders(VestingStats, {
      props: {
        totals: { promised: 0n, vested: 0n, claimable: 0n, released: 0n },
        tokenSymbol: 'SHR',
        isLoading: true
      }
    })

    expect(wrapper.find('[data-test="vesting-promised"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="vesting-stat-skeleton"]')).toHaveLength(4)
  })

  it('keeps a positive base-unit total visible', () => {
    const wrapper = renderWithProviders(VestingStats, {
      props: {
        totals: { promised: 1n, vested: 1n, claimable: 1n, released: 0n },
        tokenSymbol: 'SHR',
        isLoading: false
      }
    })

    expect(wrapper.get('[data-test="vesting-claimable"]').text()).toBe('0.000001 SHR')
  })
})
