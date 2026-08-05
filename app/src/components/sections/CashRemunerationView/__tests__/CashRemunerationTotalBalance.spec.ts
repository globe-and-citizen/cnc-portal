import { beforeEach, describe, expect, it, vi } from 'vitest'
import CashRemunerationTotalBalance from '../CashRemunerationTotalBalance.vue'
import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'

describe('CashRemunerationTotalBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractBalance.hasData.value = true
    mockUseContractBalance.total.value = {
      usd: { value: 50500, formatted: '$50.5K' },
      local: { value: 50500, formatted: '$50.5K' }
    }
  })

  const createComponent = () => {
    return shallowMount(CashRemunerationTotalBalance, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('renders correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should pass formatted total balance to OverviewCard title', () => {
    const wrapper = createComponent()
    const card = wrapper.findComponent({ name: 'OverviewCard' })
    expect(card.props('title')).toBe('$50.5K')
  })

  it('should fall back to 0 before the first balance read lands', () => {
    mockUseContractBalance.hasData.value = false

    const wrapper = createComponent()
    const card = wrapper.findComponent({ name: 'OverviewCard' })
    expect(card.props('title')).toBe(0)
  })
})
