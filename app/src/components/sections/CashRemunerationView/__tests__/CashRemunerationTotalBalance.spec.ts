import { beforeEach, describe, expect, it, vi } from 'vitest'
import CashRemunerationTotalBalance from '../CashRemunerationTotalBalance.vue'
import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'

describe('CashRemunerationTotalBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractBalance.total.value = {
      USD: {
        value: 50500,
        formated: '$50.5K',
        id: 'usd',
        code: 'USD',
        symbol: '$',
        price: 1000,
        formatedPrice: '$1K'
      }
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

  it('should fall back to 0 when current currency total does not exist', () => {
    mockUseContractBalance.total.value = {
      EUR: {
        value: 100,
        formated: 'EUR 100',
        id: 'eur',
        code: 'EUR',
        symbol: '€',
        price: 1,
        formatedPrice: '€1'
      }
    }

    const wrapper = createComponent()
    const card = wrapper.findComponent({ name: 'OverviewCard' })
    expect(card.props('title')).toBe(0)
  })
})
