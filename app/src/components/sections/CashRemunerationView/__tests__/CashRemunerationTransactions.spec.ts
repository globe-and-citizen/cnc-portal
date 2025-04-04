import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CashRemunerationTransactions from '../CashRemunerationTransactions.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

const mockError = ref<unknown>(null)
vi.mock('@vue/apollo-composable', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useQuery: vi.fn(() => ({
      result: ref({
        transactions: [
          {
            id: '1',
            status: 'pending',
            hoursWorked: 5,
            amount: '1000000000000000000',
            tokenAddress: '0x'
          }
        ]
      }),
      error: mockError
    }))
  }
})

vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useTeamStore: vi.fn(() => ({
      currentTeam: {
        id: '1',
        teamContracts: [
          {
            type: 'CashRemunerationEIP712'
          }
        ]
      }
    })),
    useCurrencyStore: vi.fn(() => ({
      currency: {
        code: 'USD'
      }
    }))
  }
})

const { mockLog } = vi.hoisted(() => {
  return {
    mockLog: vi.fn()
  }
})
vi.mock('@/utils', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    log: {
      error: mockLog
    }
  }
})

describe('CashRemunerationTransactions', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationTransactions, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should show error if there there is error graphql', async () => {
    const wrapper = createComponent()
    mockError.value = 'error'
    await wrapper.vm.$nextTick()
    expect(mockLog).toHaveBeenCalledWith('useQueryError: ', 'error')
  })
})
