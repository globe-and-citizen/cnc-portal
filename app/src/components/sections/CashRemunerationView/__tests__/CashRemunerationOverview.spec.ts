import { describe, expect, it, vi } from 'vitest'
import CashRemunerationOverview from '../CashRemunerationOverview.vue'
import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'

describe('CashRemunerationOverview', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationOverview, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('[US-PAYROLL-013] renders the Payroll account overview', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })
})
