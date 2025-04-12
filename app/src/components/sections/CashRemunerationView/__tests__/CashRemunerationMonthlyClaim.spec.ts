import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CashRemunerationMonthlyClaim from '../CashRemunerationMonthlyClaim.vue'
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
            amount: '10000000000'
          }
        ]
      }),
      loading: false,
      error: mockError,
      refetch: vi.fn()
    }))
  }
})

const mockErrorToast = vi.fn()
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
    useToastStore: vi.fn(() => ({
      addErrorToast: mockErrorToast
    }))
  }
})

describe('CashRemunerationMonthlyClaim', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationMonthlyClaim, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('renders correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('displays the error as toast and log', async () => {
    const wrapper = createComponent()
    mockError.value = new Error('Test error')
    await wrapper.vm.$nextTick()

    expect(mockErrorToast).toHaveBeenCalledWith('Failed to fetch monthly withdrawn amount')
  })
})
