import { describe, expect, it, vi } from 'vitest'
import CashRemunerationPendingClaim from '../CashRemunerationPendingClaim.vue'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

const mockError = ref<unknown>(null)
vi.mock('@/composables', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCustomFetch: vi.fn(() => ({
      get: vi.fn(() => ({
        json: vi.fn(() => ({
          data: ref([
            {
              id: 1,
              hoursWorked: 10,
              wage: {
                cashRatePerHour: 1
              }
            }
          ]),
          error: mockError
        }))
      }))
    }))
  }
})

const mockErrorToast = vi.fn()
vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useToastStore: vi.fn(() => ({
      addErrorToast: mockErrorToast
    })),
    useCurrencyStore: vi.fn(() => ({
      localCurrency: ref({
        code: 'USD',
        symbol: '$'
      }),
      nativeToken: ref({
        priceInLocal: 1000
      })
    }))
  }
})

describe('CashRemunerationPendingClaim', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationPendingClaim, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('renders correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('displays error toast when there is an error', async () => {
    const wrapper = createComponent()
    mockError.value = 'Error fetching data'

    await wrapper.vm.$nextTick()

    expect(mockErrorToast).toHaveBeenCalledWith('Failed to fetch monthly pending amount')
  })
})
