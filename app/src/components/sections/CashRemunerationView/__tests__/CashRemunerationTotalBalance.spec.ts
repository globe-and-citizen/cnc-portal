import { describe, expect, it, vi } from 'vitest'
import CashRemunerationTotalBalance from '../CashRemunerationTotalBalance.vue'
import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'

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
