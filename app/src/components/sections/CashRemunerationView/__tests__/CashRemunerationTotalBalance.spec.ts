import { describe, expect, it, vi } from 'vitest'
import CashRemunerationTotalBalance from '../CashRemunerationTotalBalance.vue'
import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useTeamStore: vi.fn(() => ({
      currentTeam: {
        id: 1,
        name: 'Test Team',
        teamContracts: [
          {
            id: 1,
            name: 'CashRemuneration',
            type: 'CashRemunerationEIP712'
          }
        ]
      }
    })),
    useCurrencyStore: vi.fn(() => ({
      localCurrency: ref({
        code: 'USD',
        symbol: '$'
      })
    }))
  }
})

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: () => ({
    balances: {
      totalValueInLocalCurrency: 1000
    },
    isLoading: ref(false)
  })
}))

describe('CashRemunerationTotalBalance', () => {
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
})
