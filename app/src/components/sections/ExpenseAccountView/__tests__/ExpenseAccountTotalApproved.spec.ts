import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ExpenseAccountTotalApproved from '../ExpenseAccountTotalApproved.vue'
import { createTestingPinia } from '@pinia/testing'
import { zeroAddress } from 'viem'
import { USDC_ADDRESS, USDT_ADDRESS } from '@/constant'

vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useExpenseDataStore: () => ({
      fetchAllExpenseData: vi.fn(),
      allExpenseDataParsed: [
        {
          status: 'enabled',
          tokenAddress: zeroAddress,
          budgetData: [
            {
              budgetType: 0,
              value: 100
            },
            {
              budgetType: 1,
              value: 200
            },
            {
              budgetType: 2,
              value: 300
            }
          ]
        },
        {
          status: 'disabled',
          tokenAddress: zeroAddress,
          budgetData: [
            {
              budgetType: 0,
              value: 400
            },
            {
              budgetType: 1,
              value: 500
            },
            {
              budgetType: 2,
              value: 600
            }
          ]
        },
        {
          status: 'enabled',
          tokenAddress: USDC_ADDRESS,
          budgetData: [
            {
              budgetType: 0,
              value: 800
            },
            {
              budgetType: 2,
              value: 900
            }
          ]
        },
        {
          status: 'enabled',
          tokenAddress: USDT_ADDRESS,
          budgetData: [
            {
              budgetType: 1,
              value: 1100
            },
            {
              budgetType: 2,
              value: 1200
            }
          ]
        },
        {
          status: 'enabled',
          tokenAddress: USDT_ADDRESS,
          budgetData: [
            {
              budgetType: 0,
              value: 1300
            }
          ]
        }
      ]
    })
  }
})

describe('ExpenseAccountTotalApproved', () => {
  const createComponent = () => {
    return shallowMount(ExpenseAccountTotalApproved, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should render correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists).toBeTruthy()
  })
})
