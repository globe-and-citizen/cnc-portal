import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ExpenseMonthSpent from '../ExpenseMonthSpent.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseEther, parseUnits, zeroAddress } from 'viem'
import { USDC_ADDRESS } from '@/constant'

const mockAddErrorToast = vi.fn()

const mockError = ref<unknown>(null)
vi.mock('@vue/apollo-composable', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useQuery: vi.fn(() => {
      return {
        result: ref({
          transactions: [
            {
              amount: parseEther('100'),
              tokenAddress: zeroAddress
            },
            {
              amount: parseUnits('100', 6),
              tokenAddress: USDC_ADDRESS
            }
          ]
        }),
        loading: false,
        error: mockError
      }
    })
  }
})

describe.skip('ExpenseMonthSpent', () => {
  const createComponent = () => {
    return shallowMount(ExpenseMonthSpent, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should render correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should show error toast', async () => {
    const wrapper = createComponent()
    mockError.value = new Error('Test error')

    await wrapper.vm.$nextTick()
    expect(mockAddErrorToast).toHaveBeenCalled()
  })
})
