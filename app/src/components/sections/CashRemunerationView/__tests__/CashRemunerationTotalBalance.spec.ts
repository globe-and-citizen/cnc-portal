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
    useCurrencyStore: vi.fn()
  }
})

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: () => ({
    balances: [
      {
        amount: 2.11,
        code: 'POL',
        valueInUSD: {
          value: 0.49,
          formated: '$0.49'
        },
        valueInLocalCurrency: {
          value: 0.44,
          formated: '€0.44'
        }
      },
      {
        amount: 0.01,
        code: 'USDC',
        valueInUSD: {
          value: 0.01,
          formated: '$0.01'
        },
        valueInLocalCurrency: {
          value: 0.01,
          formated: '€0.01'
        }
      }
    ],
    isLoading: ref(false)
  })
}))

describe.skip('CashRemunerationTotalBalance', () => {
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
