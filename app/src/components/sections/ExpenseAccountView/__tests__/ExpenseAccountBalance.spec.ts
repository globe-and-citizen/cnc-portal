import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ExpenseAccountBalance from '../ExpenseAccountBalance.vue'
import { createTestingPinia } from '@pinia/testing'

vi.mock('@/composables', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useContractBalance: vi.fn(() => ({
      balances: {},
      isLoading: false,
      refetch: vi.fn(),
      error: null
    }))
  }
})

vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useTeamStore: vi.fn(() => ({
      currentTeam: {
        teamContracts: [
          {
            type: 'ExpenseAccountEIP712'
          }
        ]
      }
    }))
  }
})

describe('ExpenseAccountBalance', () => {
  const createComponent = () => {
    return shallowMount(ExpenseAccountBalance, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should render correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })
})
