import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ExpenseAccountTotalApproved from '../ExpenseAccountTotalApproved.vue'
import { createTestingPinia } from '@pinia/testing'

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
